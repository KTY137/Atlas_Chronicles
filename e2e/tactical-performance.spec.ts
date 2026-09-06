import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { cpus, platform, release, totalmem } from "node:os";
import { gzipSync } from "node:zlib";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import type { UvttProvenance } from "@chronicle/forge";
import type { TacticalMapDocumentV1, TacticalWall } from "@chronicle/szene";
import type { TacticalTokenPlan, TacticalView } from "@chronicle/protocol";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";
import { TACTICAL_RASTER_DECODER_ID, TACTICAL_RASTER_LIMITS } from "../packages/server/src/domain/tactical-raster.ts";
import { fitCamera, mapToScreen, zoomCamera } from "../packages/render/src/geometry.ts";
import { visibleMapTiles } from "../packages/render/src/tactical-geometry.ts";

const enabled = process.env.ATLAS_TACTICAL_PERF === "1", enforce = process.env.ATLAS_TACTICAL_PERF_ENFORCE === "1";
const counts = [100, 300, 1000] as const;
const sampleMs = Number(process.env.ATLAS_TACTICAL_PERF_SAMPLE_MS ?? 6000);
const limits = { frameMs: 16.7, loadFrameFloorMs: 1000 / 30, drawCalls: 150, boundTextures: 16, sourceTextureAxis: 4096, compressedShellBytes: 1_200_000 };
const gaps = [
  "Reference laptop class and battery operation require separate qualification; this harness does not grant it.",
  "S-K1 needs 50,000 stamps plus 400 entity sprites over the real Andaria pyramid; the current persisted API admits at most 1000 tokens and has no stamp/ParticleContainer path.",
  "The fixture stores 20 lights, but the production renderer does not render dynamic lighting or 100 animated tokens; rendered dynamic lights and animated tokens are 0.",
  "RAF intervals are presentation cadence, not isolated GPU completion time. Input-event timing is not full renderer submission time.",
  "Sampled allocations and JS heap cannot establish zero hot-path allocations or total browser CPU memory.",
  "Tracked texture bytes are an estimate, not physical VRAM; buffers, renderbuffers, driver storage and framebuffer overhead are excluded.",
  "The licensed background is 6.55 MP. The server currently admits 16 MP; 144 MP/reference Andaria streaming is not exercised.",
  "This instrumented run does not establish the historical 25-measured-day S-T1 delivery-cost condition.",
];
type ProbeSnapshot = {
  frames: number[]; drawCalls: number[]; boundTextures: number[]; inputMs: number[]; truncated: boolean;
  contexts: unknown[]; liveTextures: number; peakTextures: number; textureBytesEstimate: number; peakTextureBytesEstimate: number;
  largestTextureAxis: number; liveBitmaps: number; pendingBitmaps: number; bitmapBytes: number; peakBitmapBytes: number;
  totalDrawCalls: number; contextLosses: number; longTasks: { start: number; duration: number }[]; unknownTextureFormats: number[];
  layoutResizes: { at: number; content: number[]; client: number[]; fonts: string }[];
  cameraInputs: { at: number; type: string; label: string; detail: number }[];
};
type ResourceRow = { path: string; type: string; start: number; duration: number; transfer: number; encoded: number; decoded: number };
type Probe = { start(): void; stop(): ProbeSnapshot; snapshot(): ProbeSnapshot; input(ms: number): void };
declare global { interface Window { atlasTacticalPerf: Probe } }

/** Instrument the mounted product; no replacement renderer, scene data, auth or tile responses. */
function installProbe({ denyWebGL }: { denyWebGL: boolean }) {
  // Pixi may fall back from WebGL to WebGPU and then CPU Canvas2D. This
  // explicit rendering-unavailable fault removes all three, proving the DOM path.
  if (denyWebGL) Object.defineProperty(navigator, "gpu", { value: undefined, configurable: true });
  const maxFrames = 4096, intervals = new Float64Array(maxFrames), draws = new Uint32Array(maxFrames), bound = new Uint32Array(maxFrames), inputs = new Float64Array(maxFrames);
  let frameCount = 0, inputCount = 0, previous = 0, scheduled = 0, sampling = false, truncated = false, frameDraws = 0, totalDrawCalls = 0;
  let peakTextures = 0, peakTextureBytesEstimate = 0, largestTextureAxis = 0, contextLosses = 0, pendingBitmaps = 0, bitmapBytes = 0, peakBitmapBytes = 0;
  const contexts: unknown[] = [], knownContexts = new Set<WebGLRenderingContext>(), currentTextures = new Map<WebGLRenderingContext, Map<number, WebGLTexture | null>>();
  const contextDrawCalls = new Map<WebGLRenderingContext, number>();
  const textures = new Map<WebGLTexture, Map<number, number>>(), boundThisFrame = new Set<WebGLTexture>(), bitmaps = new Map<ImageBitmap, number>(), unknownFormats = new Set<number>();
  const longTasks: { start: number; duration: number }[] = [];
  const layoutResizes: ProbeSnapshot["layoutResizes"] = [];
  const cameraInputs: ProbeSnapshot["cameraInputs"] = [];
  for (const type of ["click", "wheel", "keydown"]) document.addEventListener(type, event => {
    const element = event.target instanceof Element ? event.target : null;
    if (!element?.closest(".tactical-canvas-frame") || cameraInputs.length >= 64) return;
    const button = element.closest("button");
    cameraInputs.push({ at: performance.now(), type, label: button?.getAttribute("aria-label") ?? button?.textContent ?? element.tagName,
      detail: event instanceof WheelEvent ? event.deltaY : event instanceof MouseEvent ? event.detail : 0 });
  }, { capture: true });
  const NativeResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        for (const entry of entries) if (entry.target instanceof HTMLElement && entry.target.classList.contains("tactical-canvas") && layoutResizes.length < 64) {
          layoutResizes.push({ at: performance.now(), content: [entry.contentRect.width, entry.contentRect.height], client: [entry.target.clientWidth, entry.target.clientHeight], fonts: document.fonts.status });
        }
        callback(entries, observer);
      });
    }
  };
  const textureBytes = () => { let sum = 0; for (const levels of textures.values()) for (const bytes of levels.values()) sum += bytes; return sum; };
  const observe = (gl: WebGLRenderingContext) => {
    if (knownContexts.has(gl)) return;
    knownContexts.add(gl); currentTextures.set(gl, new Map());
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    contexts.push({ version: gl.getParameter(gl.VERSION), shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION), vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
      unmaskedVendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null, unmaskedRenderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), attributes: gl.getContextAttributes(),
      creationHostClient: (() => { const host = document.querySelector<HTMLElement>(".tactical-canvas"); return host ? [host.clientWidth, host.clientHeight] : null; })() });
    gl.canvas.addEventListener("webglcontextlost", () => { contextLosses++; });
  };
  const bytesPerPixel = (format: number): number => {
    if ([0x1908, 0x8058, 0x8c43].includes(format)) return 4; // RGBA, RGBA8, SRGB8_ALPHA8.
    if ([0x1907, 0x8051].includes(format)) return 3;
    if (format === 0x881a) return 8; if (format === 0x8814) return 16;
    unknownFormats.add(format); return 4; // Reported estimate, never a VRAM-compliance claim.
  };
  const recordImage = (gl: WebGLRenderingContext, target: number, level: number, internalFormat: number, width: number, height: number) => {
    const texture = currentTextures.get(gl)?.get(target); if (!texture || !Number.isFinite(width) || !Number.isFinite(height)) return;
    largestTextureAxis = Math.max(largestTextureAxis, width, height);
    textures.get(texture)?.set(level, width * height * bytesPerPixel(internalFormat));
    peakTextureBytesEstimate = Math.max(peakTextureBytesEstimate, textureBytes());
  };
  const prototypes = [typeof WebGLRenderingContext === "undefined" ? null : WebGLRenderingContext.prototype,
    typeof WebGL2RenderingContext === "undefined" ? null : WebGL2RenderingContext.prototype];
  for (const prototype of prototypes) {
    if (!prototype) continue;
    for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "createTexture", "deleteTexture", "bindTexture", "texImage2D", "texStorage2D"]) {
      if (!Object.hasOwn(prototype, name)) continue;
      const methods = prototype as unknown as Record<string, (...args: unknown[]) => unknown>, original = methods[name]!;
      methods[name] = function(this: WebGLRenderingContext, ...args: unknown[]) {
        const result: unknown = Reflect.apply(original, this, args); observe(this);
        if (name.startsWith("draw")) { frameDraws++; totalDrawCalls++; contextDrawCalls.set(this, (contextDrawCalls.get(this) ?? 0) + 1); }
        else if (name === "createTexture" && result) { textures.set(result as WebGLTexture, new Map()); peakTextures = Math.max(peakTextures, textures.size); }
        else if (name === "deleteTexture") { textures.delete(args[0] as WebGLTexture); }
        else if (name === "bindTexture") { currentTextures.get(this)!.set(args[0] as number, args[1] as WebGLTexture | null); if (args[1]) boundThisFrame.add(args[1] as WebGLTexture); }
        else if (name === "texStorage2D") {
          for (let level = 0; level < Math.min(16, args[1] as number); level++) recordImage(this, args[0] as number, level, args[2] as number, Math.max(1, (args[3] as number) >> level), Math.max(1, (args[4] as number) >> level));
        } else if (name === "texImage2D") {
          const source = args[5] as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | null;
          const width = args.length >= 9 ? args[3] as number : source?.naturalWidth ?? source?.width ?? 0;
          const height = args.length >= 9 ? args[4] as number : source?.naturalHeight ?? source?.height ?? 0;
          recordImage(this, args[0] as number, args[1] as number, args[2] as number, width, height);
        }
        return result;
      };
    }
  }
  const originalContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
    if (denyWebGL && /^(webgl2?|experimental-webgl|webgpu|2d)$/.test(type)) return null;
    const context: unknown = Reflect.apply(originalContext, this, [type, ...args]);
    if (context && /^(webgl2?|experimental-webgl)$/.test(type)) observe(context as WebGLRenderingContext);
    return context;
  } as typeof originalContext;
  if (typeof OffscreenCanvas !== "undefined" && denyWebGL) {
    const original = OffscreenCanvas.prototype.getContext;
    OffscreenCanvas.prototype.getContext = function(this: OffscreenCanvas, type: string, ...args: unknown[]) {
      return /^(webgl2?|experimental-webgl|webgpu|2d)$/.test(type) ? null : Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  }
  const originalBitmap = window.createImageBitmap.bind(window), originalClose = ImageBitmap.prototype.close;
  window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
    pendingBitmaps++;
    try { const bitmap = await Reflect.apply(originalBitmap, window, args) as ImageBitmap; const bytes = bitmap.width * bitmap.height * 4; bitmaps.set(bitmap, bytes); bitmapBytes += bytes; peakBitmapBytes = Math.max(peakBitmapBytes, bitmapBytes); return bitmap; }
    finally { pendingBitmaps--; }
  }) as typeof createImageBitmap;
  ImageBitmap.prototype.close = function() { bitmapBytes -= bitmaps.get(this) ?? 0; bitmaps.delete(this); originalClose.call(this); };
  try { new PerformanceObserver(list => { for (const entry of list.getEntries()) if (longTasks.length < 1024) longTasks.push({ start: entry.startTime, duration: entry.duration }); }).observe({ entryTypes: ["longtask"] }); } catch { /* Reported capability may be unavailable. */ }
  function sample(now: number) {
    if (!sampling) return;
    if (previous) {
      if (frameCount < maxFrames) { intervals[frameCount] = now - previous; draws[frameCount] = frameDraws; bound[frameCount] = boundThisFrame.size; frameCount++; } else truncated = true;
    }
    previous = now; frameDraws = 0; boundThisFrame.clear(); scheduled = requestAnimationFrame(sample);
  }
  const snapshot = (): ProbeSnapshot => ({ frames: [...intervals.subarray(0, frameCount)], drawCalls: [...draws.subarray(0, frameCount)], boundTextures: [...bound.subarray(0, frameCount)], inputMs: [...inputs.subarray(0, inputCount)], truncated,
    contexts: [...knownContexts].map((gl, index) => ({ ...contexts[index] as Record<string, unknown>, actualDrawCalls: contextDrawCalls.get(gl) ?? 0,
      mountedTacticalCanvas: gl.canvas instanceof HTMLCanvasElement && gl.canvas.dataset.mapBackend === "pixi-webgl" })),
    liveTextures: textures.size, peakTextures, textureBytesEstimate: textureBytes(), peakTextureBytesEstimate, largestTextureAxis,
    liveBitmaps: bitmaps.size, pendingBitmaps, bitmapBytes, peakBitmapBytes, totalDrawCalls, contextLosses, longTasks: [...longTasks], unknownTextureFormats: [...unknownFormats], layoutResizes: [...layoutResizes], cameraInputs: [...cameraInputs] });
  window.atlasTacticalPerf = {
    start() { cancelAnimationFrame(scheduled); sampling = true; previous = 0; frameCount = 0; inputCount = 0; truncated = false; frameDraws = 0; boundThisFrame.clear(); scheduled = requestAnimationFrame(sample); },
    stop() { sampling = false; cancelAnimationFrame(scheduled); return snapshot(); }, snapshot,
    input(ms) { if (inputCount < maxFrames) inputs[inputCount++] = ms; },
  };
}

function summary(values: readonly number[]) {
  const ordered = [...values].sort((a, b) => a - b), at = (p: number) => ordered.length ? ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * p) - 1)]! : null;
  return { count: values.length, min: ordered[0] ?? null, p50: at(.5), p95: at(.95), p99: at(.99), max: ordered.at(-1) ?? null,
    mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
}
function hostFacts(): unknown {
  const portable = { platform: platform(), release: release(), cpu: cpus()[0]?.model ?? null, logicalCpus: cpus().length, totalMemoryBytes: totalmem(), node: process.version };
  if (platform() !== "win32") return portable;
  try {
    const script = "$facts=[ordered]@{computer=(Get-CimInstance Win32_ComputerSystem|Select-Object Manufacturer,Model,TotalPhysicalMemory,NumberOfLogicalProcessors);cpu=@(Get-CimInstance Win32_Processor|Select-Object Name,NumberOfCores,NumberOfLogicalProcessors);gpu=@(Get-CimInstance Win32_VideoController|Select-Object Name,DriverVersion,VideoModeDescription);os=(Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,BuildNumber,OSArchitecture);battery=@(Get-CimInstance Win32_Battery|Select-Object Name,BatteryStatus,EstimatedChargeRemaining)};$facts|ConvertTo-Json -Depth 4 -Compress";
    return { ...portable, windows: JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true, timeout: 15_000 })) };
  } catch (error) { return { ...portable, windowsProbeError: error instanceof Error ? error.message : String(error) }; }
}
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, schema: string, origin: string, campaignId: string, mapId: string, gm: { userId: string; value: string }, reader: { userId: string; value: string; actorId: string };
let config: Parameters<typeof buildApp>[1], hardware: unknown, sourceHash: string, actorIds: string[], entryId: string, passageId: string;
const results: Record<string, unknown>[] = [], size = [2560, 2560] as const, root = resolve("packages/client/dist");
const base = () => `${origin}/api/campaigns/${campaignId}`;
const actorName = (i: number) => `Wachposten ${String(i + 1).padStart(3, "0")}`;
async function fixture() {
  if (!Number.isSafeInteger(sampleMs) || sampleMs < 2000 || sampleMs > 30_000) throw new Error("ATLAS_TACTICAL_PERF_SAMPLE_MS must be2000..30000");
  hardware = hostFacts(); schema = `chronicle_tactical_perf_${randomUUID().replaceAll("-", "")}`;
  const port = 10100 + Math.floor(Math.random() * 150); origin = `http://localhost:${port}`;
  config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: root };
  const settings = process.env.E2E_DATABASE_URL ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const url = new URL(process.env.E2E_DATABASE_URL ?? settings.databaseUrl); admin = createPgDb(url.href); await admin.query(`CREATE SCHEMA "${schema}"`);
  url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), actors = createActors(db);
  gm = await identity.bootstrap("Kaya Leistungsprobe"); campaignId = (await campaigns.createCampaign(gm.userId, { name: "Messszene – kein Referenzhardware-Siegel" })).id;
  const invitation = await campaigns.issueInvitation(gm.userId, campaignId), join = await campaigns.requestJoin(invitation.code, { displayName: "Sera Messblick" }), member = await campaigns.approveJoin(gm.userId, campaignId, join.id);
  const membership = (await db.query<{ actor_id: string }>("SELECT actor_id FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [campaignId, member.userId])).rows[0]!;
  reader = { userId: member.userId, actorId: membership.actor_id, ...await identity.issueSession(member.userId) };
  const docs = createDocuments(db), entry = await docs.saveEntry(gm.userId, campaignId, { title: "Der bekannte Westflügel", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Sera kennt diesen Flügel und seine Wachen.", marks: [] }] } }] });
  entryId = entry.entryId; passageId = entry.passagen[0]!.pid; await docs.revealPassage(gm.userId, campaignId, passageId, reader.actorId);
  const template = await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Wache der Messszene", kind: "npc", loreEntryId: entryId,
    package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: Object.fromEntries(Object.entries(DEMO_RULE_PACKAGE.fields).map(([id, field]) => [id, field.default])) } });
  actorIds = [];
  for (let i = 0; i < 300; i++) actorIds.push((await actors.instantiateActor(gm.userId, campaignId, { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name: actorName(i) })).id);
  const source = await readFile("packages/forge/test/fixtures/uvtt/sampleMap.dd2vtt", "utf8"), provenance = (JSON.parse(await readFile("packages/forge/test/fixtures/uvtt/provenance.json", "utf8")) as { provenance: UvttProvenance }).provenance;
  sourceHash = createHash("sha256").update(source).digest("hex"); expect(sourceHash).toBe("3384e501dd30c2c978c6d56d8ad7ab75ebcc282accd9580511fef9a776d4dc4a");
  const tactical = createTactical(db, config), imported = await tactical.importMap(gm.userId, campaignId, { commandId: randomUUID(), name: "UVTT mit expliziter Kapazitätsgeometrie", format: "uvtt", sourceText: source, provenance });
  mapId = imported.subjectId; const map = await tactical.getMap(gm.userId, campaignId, mapId), walls: TacticalWall[] = [...map.document.walls];
  let segments = walls.reduce((sum, wall) => sum + wall.points.length - 1, 0);
  while (segments < 1500) { const n = segments++; const x = 30 + n % 50 * 50, y = 30 + Math.floor(n / 50) * 70; walls.push({ id: `capacity-wall-${n}`, kind: "wall", points: [[x, y], [x + 20, y + 12]], elevation: 0 }); }
  const lights = [...map.document.lights];
  while (lights.length < 20) { const n = lights.length; lights.push({ id: `capacity-light-${n}`, position: [100 + n % 5 * 480, 100 + Math.floor(n / 5) * 480], range: 160, intensity: 1, colorArgb: "ffffffff", shadows: true, elevation: 0 }); }
  const document: TacticalMapDocumentV1 = { ...map.document, walls, lights, geometry: { ...map.document.geometry, regions: [{ id: "known-west", punkte: [[0, 0], [2560 / 3, 0], [2560 / 3, 2560], [0, 2560]] }] } };
  await tactical.reviseMap(gm.userId, campaignId, mapId, { commandId: randomUUID(), expectedVersion: 1, document, anchors: [{ targetKind: "region", targetId: "known-west", entryId, passageId }] });
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
}
async function scenario(count: number): Promise<{ sessionId: string; tokens: TacticalTokenPlan[] }> {
  // Each independently measured scene starts with a fresh request limiter.
  // This is a single-scene workload, not cumulative rate-limit endurance.
  await app.close(); app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port: Number(new URL(origin).port) });
  const tactical = createTactical(db, config), game = createGameplay(db), scene = await game.createScene(gm.userId, campaignId, { name: `${count} gespeicherte Tokens`, entryIds: [entryId], fictionDate: "Leistungsprobe" });
  const rows = Math.ceil(Math.ceil(count / 3) / 10), tokens: TacticalTokenPlan[] = Array.from({ length: count }, (_, i) => {
    const group = i % 3, local = Math.floor(i / 3);
    return { id: randomUUID(), actorId: actorIds[i % actorIds.length]!, x: group * 2560 / 3 + 64 + local % 10 * ((2560 / 3 - 128) / 9), y: 64 + Math.floor(local / 10) * (2432 / Math.max(1, rows - 1)), elevation: 0, rotation: 0, scale: 1 };
  });
  await tactical.savePlan(gm.userId, campaignId, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId, mapRevision: 2, tokens });
  return { sessionId: String((await game.startScene(gm.userId, campaignId, scene.id)).id), tokens };
}
async function access(browser: Browser, player = false, denyWebGL = false): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }), session = player ? reader : gm;
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await context.addInitScript(installProbe, { denyWebGL }); return { context, page: await context.newPage() };
}
async function resources(page: Page): Promise<ResourceRow[]> {
  return page.evaluate(() => performance.getEntriesByType("resource").slice(0, 512).map(entry => { const r = entry as PerformanceResourceTiming; return { path: new URL(r.name).pathname, type: r.initiatorType, start: r.startTime, duration: r.duration, transfer: r.transferSize, encoded: r.encodedBodySize, decoded: r.decodedBodySize }; }));
}
async function compressedAssets(rows: ResourceRow[]) {
  const paths = [...new Set(rows.filter(row => /\.(js|css|woff2?|ttf|otf)$/.test(row.path)).map(row => row.path))];
  let gzipEquivalentBytes = 0, uncompressedBytes = 0;
  for (const path of paths) { const file = resolve(root, `.${decodeURIComponent(path)}`); if (!file.startsWith(root + sep)) throw new Error("Asset path escaped the built client"); const bytes = await readFile(file); uncompressedBytes += bytes.length; gzipEquivalentBytes += gzipSync(bytes).length; }
  return { assets: paths, uncompressedBytes, gzipEquivalentBytes, actualEncodedBodyBytes: rows.filter(row => paths.includes(row.path)).reduce((sum, row) => sum + row.encoded, 0) };
}
/** Observe the actual renderer's ResizeObserver delivery, not a newly invented
 * fit from the canvas rectangle. Production uses this fractional content box
 * for its camera and integer host client dimensions for requesting tiles. */
async function stableMapGeometry(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const host = document.querySelector<HTMLElement>(".tactical-canvas")!, canvas = host.querySelector<HTMLCanvasElement>("canvas")!;
    const began = performance.now(); let previous = "", stableFrames = 0;
    return new Promise<{ viewport: [number, number]; tileViewport: [number, number]; canvas: [number, number]; pixelRatio: number }>((resolve, reject) => {
      const check = () => {
        const resizes = window.atlasTacticalPerf.snapshot().layoutResizes, content = resizes.at(-1)?.content, bounds = canvas.getBoundingClientRect();
        const geometry = { viewport: [content?.[0] ?? 0, content?.[1] ?? 0] as [number, number], tileViewport: [host.clientWidth, host.clientHeight] as [number, number],
          canvas: [bounds.width, bounds.height] as [number, number], pixelRatio: devicePixelRatio };
        const valid = resizes.length < 64 && document.fonts.status === "loaded" && geometry.viewport.every(v => v > 0)
          && geometry.viewport.every((v, i) => Math.abs(v - geometry.canvas[i]!) < 1e-6);
        const next = JSON.stringify(geometry); stableFrames = valid && next === previous ? stableFrames + 1 : 0; previous = next;
        if (stableFrames >= 4) resolve(geometry);
        else if (performance.now() - began > 5000) reject(new Error(`Tactical layout did not stabilize: ${next}`));
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  });
}
async function settle(page: Page, camera: ReturnType<typeof fitCamera>, geometry: Awaited<ReturnType<typeof stableMapGeometry>>, report: Record<string, unknown>, stage: string) {
  const tiles = visibleMapTiles(size, geometry.tileViewport, camera, geometry.pixelRatio), expected = tiles.length;
  const check = { stage, camera, geometry, expected, expectedTiles: tiles.map(t => `${t.level}/${t.x}/${t.y}`), before: await geometrySnapshot(page), after: null as unknown };
  (report.geometryChecks as unknown[] | undefined ?? (report.geometryChecks = []) as unknown[]).push(check);
  await page.waitForLoadState("networkidle");
  try {
    expect(await stableMapGeometry(page), "Viewport must retain the calibrated camera geometry").toEqual(geometry);
    await expect.poll(() => page.evaluate(() => { const p = window.atlasTacticalPerf.snapshot(); return [p.liveBitmaps, p.pendingBitmaps]; })).toEqual([expected, 0]);
    expect(await stableMapGeometry(page), "Layout changes must not silently change the measured camera").toEqual(geometry);
  }
  finally { check.after = await geometrySnapshot(page); }
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}
async function geometrySnapshot(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector<HTMLElement>(".tactical-canvas")!, canvas = host.querySelector<HTMLCanvasElement>("canvas")!, probe = window.atlasTacticalPerf.snapshot();
    return { canvas: [canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height], client: [host.clientWidth, host.clientHeight],
      fonts: document.fonts.status, layoutResizes: probe.layoutResizes, cameraInputs: probe.cameraInputs, contexts: probe.contexts, liveBitmaps: probe.liveBitmaps, pendingBitmaps: probe.pendingBitmaps };
  });
}
/** A mounted but untouched map is a control for changes in host/browser RAF
 * scheduling. It does not subtract those changes from the measured verdict. */
async function idleCadence(page: Page) {
  const result = await page.evaluate(async () => {
    const began = performance.now(); window.atlasTacticalPerf.start();
    await new Promise<void>(done => {
      const frame = () => { if (performance.now() - began >= 1000) done(); else requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    });
    return { probe: window.atlasTacticalPerf.stop(), elapsedMs: performance.now() - began, visibilityState: document.visibilityState, hasFocus: document.hasFocus() };
  });
  return { frames: summary(result.probe.frames), elapsedMs: result.elapsedMs, drawCallsPerFrame: summary(result.probe.drawCalls), visibilityState: result.visibilityState, hasFocus: result.hasFocus };
}
/** Real canvas event listeners receive paced input. Event construction is measurement overhead,
 * explicitly excluded from any claim that product hot paths allocate zero objects. */
async function motion(page: Page, duration: number, start: readonly [number, number], kind: "pan" | "zoom" = "pan") {
  await page.locator('canvas[data-map-backend="pixi-webgl"]').scrollIntoViewIfNeeded();
  const bounds = (await page.locator('canvas[data-map-backend="pixi-webgl"]').boundingBox())!;
  await page.mouse.move(bounds.x + start[0], bounds.y + start[1]); if (kind === "pan") await page.mouse.down();
  try {
    return await page.evaluate(async ({ duration, start, kind }) => {
      const canvas = document.querySelector('canvas[data-map-backend="pixi-webgl"]') as HTMLCanvasElement, bounds = canvas.getBoundingClientRect();
      const began = performance.now(); let previousZoom = 0; window.atlasTacticalPerf.start();
      await new Promise<void>(done => {
        function advance(now: number) {
          const elapsed = now - began;
          if (elapsed >= duration) { done(); return; }
          const progress = elapsed / duration, x = start[0] + Math.sin(progress * Math.PI * 4) * 48, y = start[1] + Math.sin(progress * Math.PI * 2) * 24;
          const zoom = Math.sin(progress * Math.PI * 4) * 160;
          const event = kind === "pan" ? new PointerEvent("pointermove", { bubbles: true, pointerId: 1, pointerType: "mouse", buttons: 1, clientX: bounds.x + x, clientY: bounds.y + y })
            : new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaMode: 0, deltaY: zoom - previousZoom, clientX: bounds.x + bounds.width / 2, clientY: bounds.y + bounds.height / 2 });
          previousZoom = zoom;
          const before = performance.now(); canvas.dispatchEvent(event); window.atlasTacticalPerf.input(performance.now() - before);
          requestAnimationFrame(advance);
        }
        requestAnimationFrame(advance);
      });
      return { ...window.atlasTacticalPerf.stop(), elapsedMs: performance.now() - began };
    }, { duration, start, kind });
  } finally { if (kind === "pan") await page.mouse.up(); }
}
async function writeReport(report: Record<string, unknown>) {
  const path = test.info().outputPath("tactical-performance.json"); await writeFile(path, JSON.stringify(report, null, 2));
  await test.info().attach("tactical-performance.json", { path, contentType: "application/json" }); results.push(report);
}

// Retain-on-failure tracing still records screenshots on a successful run;
// disable that workload here and keep explicit result screenshots instead.
test.use({ trace: "off" });
test.describe("opt-in mounted tactical performance evidence", () => {
  test.skip(!enabled, "Set ATLAS_TACTICAL_PERF=1 explicitly; not part of the ordinary browser gate.");
  test.beforeAll(async () => { test.setTimeout(180_000); await fixture(); });
  test.afterAll(async () => {
    try { if (enabled && results.length) {
      const missed = results.filter(result => typeof result.tokenCount === "number" && result.observedBudgetVerdict === "over-budget").map(result => result.tokenCount as number);
      const missedFrames = results.filter(result => typeof result.tokenCount === "number" && (result.observedBudgets as { frameP95?: boolean } | undefined)?.frameP95 === false).map(result => result.tokenCount as number);
      await writeFile(test.info().outputPath("tactical-performance-summary.json"), JSON.stringify({ collectedAt: new Date().toISOString(), hardware,
        firstTestedTokenCountOverObservedBudgets: missed.length ? Math.min(...missed) : null, testedCounts: counts, isExactCapacityCliff: false,
        firstTestedTokenCountOverFrameP95: missedFrames.length ? Math.min(...missedFrames) : null,
        gateVerdict: "S-K1/S-T1/G-PERF1 not closed", gaps, reports: results }, null, 2));
    } } finally {
      try { await app?.close(); } finally { await db?.close();
        if (admin) { try { if (!/^chronicle_tactical_perf_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected performance schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.close(); } }
      }
    }
  });

  for (const count of counts) test(`${count} persisted tokens on the real tactical board`, async ({ browser }) => {
    test.setTimeout(120_000);
    const prepared = await scenario(count), { context, page } = await access(browser), cdp = await context.newCDPSession(page);
    const errors: string[] = [], deniedTiles: number[] = []; let unintendedTokenMoves = 0;
    page.on("pageerror", error => errors.push(error.message)); page.on("response", response => { if (response.url().includes("/tactical/tiles/") && response.status() !== 200) deniedTiles.push(response.status()); });
    page.on("request", request => { if (request.method() === "POST" && /\/tactical\/tokens\/[^/]+\/move$/.test(new URL(request.url()).pathname)) unintendedTokenMoves++; });
    const report: Record<string, unknown> = { formatVersion: 1, collectedAt: new Date().toISOString(), tokenCount: count, distinctActors: Math.min(count, actorIds.length), sourceSha256: sourceHash,
      originalSource: "packages/forge/test/fixtures/uvtt/sampleMap.dd2vtt", syntheticAdditions: "Deterministic capacity walls/lights and valid actor instances; original external bytes retained unchanged.",
      wallSegments: 1500, persistedLights: 20, renderedDynamicLights: 0, animatedTokens: 0, imageSize: size, hardware, decoderId: TACTICAL_RASTER_DECODER_ID, serverRasterLimits: TACTICAL_RASTER_LIMITS,
      browserVersion: browser.version(), browserProject: test.info().project.name, browserHeadless: test.info().project.use.headless ?? true,
      playwrightTrace: "off", harnessRevision: "stable-content-camera-v2",
      referenceHardware: { qualified: false, declaredLabel: process.env.ATLAS_TACTICAL_PERF_REFERENCE_LABEL ?? null }, gateVerdict: "S-K1/S-T1/G-PERF1 not closed", gaps, thresholds: limits,
      serverCacheCondition: "Shared server process cache; no assertion of cold raster decode. Fresh HTTP app/request limiter for each scene.", samplingOverhead: "WebGL wrappers and synthetic PointerEvent allocation are included in cadence/input timings." };
    try {
      await cdp.send("Performance.enable");
      const opened = Date.now(); await page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
      await expect(page.getByRole("tab", { name: "Szenenkarte", exact: true })).toBeVisible();
      report.shellControlReadyMs = Date.now() - opened; report.initialShellAssets = await compressedAssets(await resources(page));
      await page.evaluate(() => window.atlasTacticalPerf.start());
      const mapOpened = Date.now(); await page.getByRole("tab", { name: "Szenenkarte", exact: true }).click();
      await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1); await expect(page.locator("form.tactical-token")).toHaveCount(count);
      const geometry = await stableMapGeometry(page), { viewport } = geometry;
      report.calibration = { geometry, beforeFit: await geometrySnapshot(page), method: "Fonts ready and four stable RAF intervals after the production ResizeObserver delivery, then real Ganze Karte button. Camera uses content size; tiles use host client size." };
      // A resize preserves the renderer's old scale; boundingBox alone cannot
      // recover that camera. Explicitly refit through the real public control.
      await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
      expect(await stableMapGeometry(page)).toEqual(geometry);
      let camera = fitCamera(size, viewport); await settle(page, camera, geometry, report, "overview"); report.firstFullyPaintedMapMs = Date.now() - mapOpened;
      const loadSample = await page.evaluate(() => window.atlasTacticalPerf.stop());
      report.loadFrames = summary(loadSample.frames); report.loadOver33_33msFrames = loadSample.frames.filter(ms => ms > limits.loadFrameFloorMs + 1e-6).length;
      const visible = () => prepared.tokens.filter(token => { const p = mapToScreen([token.x, token.y], camera); return p[0] >= -11 && p[1] >= -11 && p[0] <= viewport[0] + 11 && p[1] <= viewport[1] + 11; }).length;
      report.initialOverviewVisibleTokens = visible();
      let zooms = 0;
      while (visible() > 100 && zooms < 10) {
        await page.getByRole("button", { name: "Karte vergrößern", exact: true }).click(); zooms++;
        camera = zoomCamera(camera, 1.5, [viewport[0] / 2, viewport[1] / 2]);
        expect(await page.evaluate(() => window.atlasTacticalPerf.snapshot().cameraInputs.filter(input => input.type === "click" && input.label === "Karte vergrößern").length), "One real zoom click per modeled camera step").toBe(zooms);
      }
      report.viewport = viewport; report.camera = camera; report.zoomClicks = zooms;
      await settle(page, camera, geometry, report, "zoomed"); report.sampleStartVisibleTokens = visible();
      expect(report.initialOverviewVisibleTokens).toBe(count); expect(visible()).toBeLessThanOrEqual(100);
      const candidates = Array.from({ length: 80 }, (_, i) => [24 + i % 10 * (viewport[0] - 48) / 9, 24 + Math.floor(i / 10) * (viewport[1] - 48) / 7] as const);
      const start = candidates.find(point => prepared.tokens.every(token => { const p = mapToScreen([token.x, token.y], camera); return Math.hypot(p[0] - point[0], p[1] - point[1]) > 24; }));
      if (!start) throw new Error("No empty camera-pan start point in the real projected scene");
      report.browser = await page.evaluate(async () => {
        const nav = navigator as Navigator & { deviceMemory?: number; getBattery?: () => Promise<{ charging: boolean; level: number }> };
        let battery: unknown = null; try { if (nav.getBattery) { const b = await nav.getBattery(); battery = { charging: b.charging, level: b.level }; } } catch { /* unavailable is explicit */ }
        return { userAgent: nav.userAgent, platform: nav.platform, hardwareConcurrency: nav.hardwareConcurrency, deviceMemoryGiBHint: nav.deviceMemory ?? null, devicePixelRatio, battery,
          appearance: { theme: document.documentElement.dataset.appearanceTheme ?? null, density: document.documentElement.dataset.appearanceDensity ?? null, sampling: document.documentElement.dataset.appearanceSampling ?? null },
          visibilityState: document.visibilityState, longTaskObserverSupported: PerformanceObserver.supportedEntryTypes.includes("longtask") };
      });
      report.beforeMetrics = await cdp.send("Performance.getMetrics"); report.beforeDOM = await cdp.send("Memory.getDOMCounters");
      report.idleBeforePan = await idleCadence(page);
      const sample = await motion(page, sampleMs, start);
      report.idleBeforeZoom = await idleCadence(page);
      const zoomSample = await motion(page, sampleMs, start, "zoom");
      report.idleAfterZoom = await idleCadence(page);
      expect(await stableMapGeometry(page), "Measured layout must retain the calibrated viewport").toEqual(geometry);
      report.frames = summary(sample.frames); report.drawCallsPerFrame = summary(sample.drawCalls); report.boundTexturesPerFrame = summary(sample.boundTextures); report.inputDispatchMs = summary(sample.inputMs);
      report.over16_7msFraction = sample.frames.filter(ms => ms > 16.7 + 1e-6).length / Math.max(1, sample.frames.length); report.probe = sample;
      report.zoom = { frames: summary(zoomSample.frames), drawCallsPerFrame: summary(zoomSample.drawCalls), boundTexturesPerFrame: summary(zoomSample.boundTextures), inputDispatchMs: summary(zoomSample.inputMs), probe: zoomSample };
      report.afterMetrics = await cdp.send("Performance.getMetrics"); report.afterDOM = await cdp.send("Memory.getDOMCounters");
      // Separate pan/zoom allocation windows keep profiler overhead out of the
      // cadence result and expose the remaining zoom stroke-rebuild cost.
      for (const kind of ["pan", "zoom"] as const) {
        const key = kind === "pan" ? "allocations" : "zoomAllocations";
        try {
          await cdp.send("HeapProfiler.startSampling", { samplingInterval: 32768, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
          const allocationMotion = await motion(page, 2000, start, kind);
          const allocation = await cdp.send("HeapProfiler.stopSampling") as { profile: { head: unknown } };
          const stack = [allocation.profile.head], byUrl = new Map<string, number>(), sites: { bytes: number; callFrame: unknown }[] = []; let sampledBytes = 0;
          while (stack.length) { const node = stack.pop() as { selfSize?: number; callFrame?: { url?: string }; children?: unknown[] }; const bytes = node.selfSize ?? 0, url = node.callFrame?.url ?? ""; sampledBytes += bytes; byUrl.set(url, (byUrl.get(url) ?? 0) + bytes); if (bytes) sites.push({ bytes, callFrame: node.callFrame }); stack.push(...node.children ?? []); }
          const productBytes = [...byUrl].filter(([url]) => url.startsWith(`${origin}/assets/`)).reduce((sum, [, bytes]) => sum + bytes, 0);
          report[key] = { samplingInterval: 32768, sampleMs: 2000, elapsedMs: allocationMotion.elapsedMs, inputEvents: allocationMotion.inputMs.length, frames: summary(allocationMotion.frames),
            sampledBytes, productAssetSampledBytes: productBytes, productAssetSampledBytesPerInput: productBytes / Math.max(1, allocationMotion.inputMs.length),
            calculation: "Sum each CDP SamplingHeapProfileNode.selfSize once; already weighted by V8, no multiplication by samplingInterval. Includes collected allocations.",
            window: `Separate ${kind} window after both cadence samples; includes any real tile/poll work triggered during this window.`,
            largestAssets: [...byUrl].sort((a, b) => b[1] - a[1]).slice(0, 20), largestSites: sites.sort((a, b) => b.bytes - a.bytes).slice(0, 20), provesZeroAllocations: false };
        } catch (error) { report[key] = { unavailable: error instanceof Error ? error.message : String(error), provesZeroAllocations: false }; }
      }
      report.resources = await resources(page); report.allLoadedCodeAssets = await compressedAssets(report.resources as ResourceRow[]);
      await page.screenshot({ path: test.info().outputPath(`tactical-${count}.png`) });
      await page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name: "Chronik", exact: true }).click();
      await expect(page.locator('canvas[data-map-backend="pixi-webgl"]')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => { const p = window.atlasTacticalPerf.snapshot(); return [p.liveBitmaps, p.pendingBitmaps, p.liveTextures]; })).toEqual([0, 0, 0]);
      report.afterTeardown = await page.evaluate(() => window.atlasTacticalPerf.snapshot());
      const frameStats = summary([...sample.frames, ...zoomSample.frames]), drawStats = summary([...sample.drawCalls, ...zoomSample.drawCalls]), textureStats = summary([...sample.boundTextures, ...zoomSample.boundTextures]), shell = report.initialShellAssets as { gzipEquivalentBytes: number };
      const measured = { frameP95: frameStats.p95 !== null && frameStats.p95 <= limits.frameMs + 1e-6, drawCallsMax: (drawStats.max ?? Infinity) <= limits.drawCalls,
        boundTexturesMax: (textureStats.max ?? Infinity) <= limits.boundTextures, textureAxis: zoomSample.largestTextureAxis <= limits.sourceTextureAxis, shellGzipEquivalent: shell.gzipEquivalentBytes <= limits.compressedShellBytes };
      report.observedBudgets = measured; report.observedBudgetVerdict = Object.values(measured).every(Boolean) ? "within-observed-budgets" : "over-budget";
      expect(sample.frames.length).toBeGreaterThan(30); expect(sample.totalDrawCalls).toBeGreaterThan(0); expect(sample.contexts.length).toBeGreaterThan(0); expect(sample.truncated).toBe(false);
      expect(zoomSample.frames.length).toBeGreaterThan(30); expect(zoomSample.totalDrawCalls).toBeGreaterThan(0); expect(zoomSample.truncated).toBe(false);
      expect(sample.contexts.some(context => { const c = context as { mountedTacticalCanvas: boolean; actualDrawCalls: number }; return c.mountedTacticalCanvas && c.actualDrawCalls > 0; }), "Measured draw calls must belong to the mounted tactical canvas, not Pixi capability probes").toBe(true);
      report.unintendedTokenMoves = unintendedTokenMoves;
      expect(errors).toEqual([]); expect(deniedTiles).toEqual([]); expect(unintendedTokenMoves, "Camera-pan samples must not drag or persist a token").toBe(0);
      if (enforce) expect(measured, "Observed numeric thresholds failed; this is still not reference-hardware qualification").toEqual(Object.fromEntries(Object.keys(measured).map(key => [key, true])));
    } catch (error) { report.runFailure = error instanceof Error ? error.message : String(error); throw error; }
    finally { try { await writeReport(report); } finally { await context.close(); } }
  });

  test("the projected reader and a rendering-unavailable DOM path retain real commands", async ({ browser }) => {
    test.setTimeout(90_000); const prepared = await scenario(300), player = await access(browser, true), fallback = await access(browser, false, true);
    const report: Record<string, unknown> = { formatVersion: 1, collectedAt: new Date().toISOString(), scenario: "reader-and-rendering-unavailable", hardware, gateVerdict: "Functional fallback evidence only" };
    try {
      await player.page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`); await player.page.getByRole("tab", { name: "Szenenkarte", exact: true }).click();
      const response = await player.page.request.get(`${base()}/sessions/${prepared.sessionId}/tactical`), projected = await response.json() as TacticalView;
      expect(response.status()).toBe(200); expect(projected.tokens).toHaveLength(100); expect(projected.regions).toHaveLength(1); expect(Object.hasOwn(projected, "walls")).toBe(false);
      await expect(player.page.locator("form.tactical-token")).toHaveCount(100); report.readerProjectionTokens = projected.tokens.length;
      await fallback.page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
      report.injectedWebGLUnavailable = await fallback.page.evaluate(() => document.createElement("canvas").getContext("webgl2") === null);
      report.injectedWebGPUUnavailable = await fallback.page.evaluate(() => Reflect.get(navigator, "gpu") === undefined);
      report.injectedCanvas2DUnavailable = await fallback.page.evaluate(() => document.createElement("canvas").getContext("2d") === null);
      expect(report.injectedWebGLUnavailable, "The explicit context-unavailable injection must actually deny WebGL").toBe(true);
      expect(report.injectedWebGPUUnavailable, "Pixi's alternate WebGPU path must also be unavailable for this DOM-fallback scenario").toBe(true);
      expect(report.injectedCanvas2DUnavailable, "Pixi also supports a CPU Canvas2D fallback").toBe(true);
      await fallback.page.getByRole("tab", { name: "Szenenkarte", exact: true }).click();
      await expect(fallback.page.getByText("Die Liste darunter bietet dieselben Figurenbefehle.", { exact: false })).toBeVisible();
      await expect(fallback.page.locator('canvas[data-map-backend="pixi-webgl"]')).toHaveCount(0);
      await expect(fallback.page.locator("form.tactical-token")).toHaveCount(300);
      const form = fallback.page.locator("form.tactical-token").filter({ has: fallback.page.getByRole("heading", { name: actorName(0), exact: true }) });
      await form.getByLabel("X", { exact: true }).fill(String(prepared.tokens[0]!.x + 1));
      const saved = fallback.page.waitForResponse(r => r.url().endsWith(`/tactical/tokens/${prepared.tokens[0]!.id}/move`) && r.request().method() === "POST");
      await form.getByRole("button", { name: "Position speichern", exact: true }).focus(); await fallback.page.keyboard.press("Enter");
      expect((await saved).status()).toBe(200);
      expect((await createTactical(db, config).getSession(gm.userId, campaignId, prepared.sessionId)).tokens.find(t => t.id === prepared.tokens[0]!.id)!.x).toBe(prepared.tokens[0]!.x + 1);
      report.keyboardDOMCommandPersisted = true; report.fallbackProbe = await fallback.page.evaluate(() => window.atlasTacticalPerf.snapshot());
      await form.screenshot({ path: test.info().outputPath("tactical-DOM-fallback.png") });
    } catch (error) { report.runFailure = error instanceof Error ? error.message : String(error); throw error; }
    finally { try { await writeReport(report); } finally { try { await player.context.close(); } finally { await fallback.context.close(); } } }
  });
});
