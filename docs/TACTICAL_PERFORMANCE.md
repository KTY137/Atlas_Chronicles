# Tactical performance evidence

This is the runnable evidence protocol for the tactical implementation, including its M8 appearance integration. It does **not** close S-K1, S-T1 or G-PERF1. A successful Playwright run means that measurements and functional fallback checks completed. It does not mean that the product met its performance budgets or that the machine qualified as reference hardware.

## Run

Use the current canonical client build, the repository's installed Playwright browser and a real local PostgreSQL instance. The harness uses `E2E_DATABASE_URL`, or the existing `.local/config.json` database URL when that variable is absent. It creates and drops only its own randomly named `chronicle_tactical_perf_<uuid>` schema and serves that schema on an isolated local port. It does not export session cookies or database credentials into its report.

Run without another browser/build workload competing for the same machine. Use a unique output directory outside Playwright's default `test-results` directory:

```powershell
$env:ATLAS_TACTICAL_PERF = '1'
npx.cmd playwright test e2e/tactical-performance.spec.ts --workers=1 --output .local/e2e-tactical-performance-20260906 --reporter list
```

The default sample is six seconds **each** of pan and zoom per token count, followed by separate two-second allocation samples for pan and zoom. One-second untouched-map cadence controls run before pan, before zoom and after zoom. `ATLAS_TACTICAL_PERF_SAMPLE_MS` accepts integers from 2000 to 30000. `ATLAS_TACTICAL_PERF_ENFORCE=1` additionally fails the test when the observed numeric thresholds fail. Without that flag, failures are still recorded as `over-budget` in JSON. Functional errors, missing rendering, resource leaks and invalid sample collection always fail.

`ATLAS_TACTICAL_PERF_REFERENCE_LABEL` can record an operator's hardware label. It is a label, not an attestation: reports retain `referenceHardware.qualified: false`. The harness uses Chromium CDP and currently supports Chromium/Edge, not Firefox. The default Windows browser channel is the repository's installed Edge. Use the normal Playwright `--headed` option for an attended reference run; preserve the actual headless/headed value in the report.

The ordinary browser gate skips this file unless `ATLAS_TACTICAL_PERF=1`. Clear the opt-in environment variables after the dedicated run.

## What is actually exercised

The mounted production application, real PostgreSQL domain methods, HTTP endpoints, reader projection, server PNG masking, browser tile requests, ImageBitmap decoding and Pixi WebGL renderer are used. No scene, authentication response, tile response or renderer is mocked. Each independently measured scene starts a fresh isolated HTTP app, resetting its request limiter; this is not a cumulative rate-limit endurance test. A preliminary consecutive-scene run reached that limiter, so it could not provide a complete 1000-token sample.

The background is the external, licensed 2560 × 2560 UVTT sample at `packages/forge/test/fixtures/uvtt/sampleMap.dd2vtt`, with its checked-in provenance and license. Its SHA-256 must be `3384e501dd30c2c978c6d56d8ad7ab75ebcc282accd9580511fef9a776d4dc4a`. Exact imported source bytes remain retained. A new map revision adds explicitly synthetic, deterministic geometry to reach 1500 wall segments and 20 persisted lights. These additions are a capacity workload, not a claim about an external map corpus.

Three separate scenes contain 100, 300 and 1000 valid persisted tokens. The fixture creates 300 actor instances through the real actor-template API; the 1000-token case reuses those actors. All tokens appear in the initial overview. The harness then uses the real zoom buttons to reduce the initial measured viewport to at most 100 visible tokens. Paced pan and zoom events go through the canvas's actual listeners. The full DOM token list remains mounted, so its cost is included.

Before deriving camera coordinates, harness revision `stable-content-camera-v2` waits for loaded fonts and four stable RAF intervals after the production renderer's `ResizeObserver` delivery, then clicks the real **Ganze Karte** control. The renderer's fractional content-box dimensions determine the fitted camera; the host's integer `clientWidth`/`clientHeight` determine requested tiles. These can differ and are recorded separately. The test verifies one actual click per modeled zoom, unchanged calibrated dimensions, the exact expected number of live tile bitmaps, and zero pending decodes. It does not accept any nonzero tile count as readiness. Bounded resize/input histories and expected tile identities are written even when a readiness assertion fails.

A fourth case verifies that a reader receives only the 100 tokens in their known region, then deliberately makes WebGL, WebGPU and CPU Canvas2D unavailable in a separate GM browser. The product's real DOM fallback must save a token position using keyboard submission and persist it through the actual HTTP command. This is explicit rendering-unavailable fault injection, not a network or product-renderer replacement. Denying GPU APIs alone is insufficient: the installed Pixi renderer selector can also fall back to CPU Canvas2D. The harness directly checks that all three entry points are denied before asserting the product's fallback notice and missing canvas.

## Metrics and their limits

Each test emits `tactical-performance.json` plus a screenshot. The final test's output directory also receives `tactical-performance-summary.json`. Reports retain bounded raw frame samples, actual context information, failures and limitations. The summary identifies the first **tested** token count missing the combined pan/zoom p95 frame budget, and separately the first tested count missing any observed budget. Neither is an exact capacity cliff.

| Metric | Collection | Interpretation |
| --- | --- | --- |
| Frame p50/p95/p99 | Browser `requestAnimationFrame` intervals during separately reported pan and zoom | Presentation cadence, including instrumentation; not isolated GPU duration. Combined pan/zoom p95 is compared with 16.7 ms. |
| Idle cadence controls | One second with the real map mounted and no camera input, around the cadence samples | Helps distinguish a general host/browser scheduling change from camera work. Visibility and focus are recorded. Slow idle cadence is not subtracted from results and does not turn a missed budget into a pass. |
| Load cadence | RAF intervals from opening the map through font/layout calibration, the real fit control, complete expected tile decoding and further settled frames | Reports count above 33.33 ms. The explicit network-idle settling window is included; this is not a perceptual first-paint timing. |
| First usable controls / fully painted map | Wall clock around the actual navigation and readiness checks | Includes real server work; shared server tile cache is reported and is not claimed cold. |
| Draw calls | Actual WebGL draw calls per sampled RAF interval | Compared with the 150-call ceiling. Core WebGL and WebGL2 methods are instrumented; per-context draw counts distinguish the mounted tactical canvas from capability-probe contexts. |
| Texture count | Distinct texture bindings per interval and live WebGL textures | Bindings include uploads, so this is a conservative bound rather than an exact set of simultaneously sampled textures. The observed ceiling is 16 bindings. |
| Texture memory | Uploaded dimensions/formats and mip levels | An estimate only. Buffers, renderbuffers, framebuffer overhead, driver allocations and unknown format details prevent a physical VRAM claim. Unknown formats are listed. |
| Input work | Synchronous dispatch time of the real canvas event | Excludes the subsequent asynchronous render; not the full 4 ms renderer submission budget. |
| Heap / DOM / allocations | CDP metrics, DOM counters and separate pan/zoom 32 KiB sampled allocation profiles | Each V8-weighted `SamplingHeapProfileNode.selfSize` is summed once, with no extra multiplication by the sampling interval. Includes collected allocations; function/line/column and asset aggregates are retained. Each window records its actual input count, elapsed time, frame cadence and product bytes per input, because a slower input schedule alone reduces volume per second. Neither zero hot-path allocations nor total browser CPU memory can be established this way. |
| Payload | Actual resource timings and gzip size of the exact requested build assets | Actual encoded body size and calculated gzip-equivalent size are separate; the development server need not compress responses. Initial shell gzip equivalent is compared with 1.2 MB. |
| Cleanup | Leave the map, observe removed canvas and zero tracked live ImageBitmaps, pending decodes and WebGL textures | Detects resources still owned by this mounted view. It is not a process-wide GPU memory measurement. |

The sample buffers cap at 4096 frames, 4096 input samples, 1024 long tasks, 512 resource rows, 64 resize deliveries and 64 initial camera inputs. Frame truncation fails the test. Instrumentation wraps graphics methods and allocates synthetic input events; this overhead is part of the observed cadence. Allocation profiling runs separately to keep its additional overhead out of the reported pan/zoom frame sample. Playwright tracing is disabled for this file, because even retain-on-failure tracing records during successful runs. Explicit result screenshots remain. Wall geometry is exercised; persisted lighting currently has no dynamic rendering cost.

## Binding requirements that remain open

The source requirements are [RB-20b S-K1](../design/research/RB-20b-machbarkeit.md), [RB-02 §5](../design/research/RB-02-rendering-tech.md), [architecture §20.4 / G-PERF1](../design/06-giga-product-architecture.md), [round-03 S-T1](../design/iterations/round-03/verdict.md) and [implementation plan M7](./IMPLEMENTATION_PLAN.md).

| Requirement | Current evidence boundary |
| --- | --- |
| S-K1: 50,000 bulk stamps plus 400 entity sprites over the real Andaria pyramid; report first 16.7 ms miss | No persisted stamp/ParticleContainer path exists. The token API admits at most 1000 tokens. This harness cannot substitute 1000 Graphics tokens for that required workload. |
| Reference 2020–2022 integrated-GPU laptop, 8–16 GB RAM, 1920×1080 at 1× or 1440p at 1.5×, battery operation | Viewport is 1920×1080 at 1×. Host facts, actual browser renderer and available power evidence are recorded; reference-class and on-battery qualification remain a separate requirement. |
| 300 tokens, at most 100 visible/animated; 20 dynamic lights, at most 8 animated; 1500 walls | Token and wall counts are exercised. There are **zero animated tokens and zero rendered dynamic lights**, despite 20 persisted light definitions. |
| 2000 drawings, 2000 particles, 144 MP tiled maps | Not exercised. Current admitted server image size is at most 16 MP; the real sample is 6.55 MP. |
| 60 fps sustained; hard 30 fps floor while loading | Observed cadence and load excursions are recorded. A short instrumented run on unqualified hardware does not establish sustained reference performance. |
| 2 ms store, 4 ms submission, 8 ms GPU; zero hot-path allocations | Not isolated by this harness. RAF, input time and sampled allocations are supporting evidence only. |
| CPU ≤400 MB; GPU ≤250 MB | JS heap and a partial texture estimate are insufficient for these total-memory claims. |
| Shell JS ≤400 KB, renderer ≤150 KB, CSS/fonts ≤150 KB; first interactive ≤1.2 MB | Actual loaded assets and total gzip equivalent are reported. The harness does not invent bundle-role assignments or close each component budget. |
| S-T1 measured delivery cost ≤25 days | Requires the historical work log and scope accounting; cannot be inferred from benchmark timing. |

## Host and run status

The read-only Windows inventory on 2026-09-06 identified Windows 11 Pro build 26200, an AMD Ryzen 7 9800X3D, an NVIDIA GeForce RTX 5080 and 33,978,716,160 bytes of system RAM. This desktop is outside the specified integrated-GPU laptop reference class. WMI's `AdapterRAM` is deliberately not used as VRAM capacity because its width can truncate modern GPU capacities. The actual browser may use a different rendering backend; its WebGL context report takes precedence over guessing from the installed GPU name.

### Baseline before camera-geometry caching

The baseline untraced run on 2026-09-06 completed **4/4 functional/collection checks in 1.5 minutes**, using client build `index-DMbNOwxc.js`, Edge 152 in headless mode, 1920×1080 at 1×. Actual draw calls belonged to the mounted tactical canvas's **WebGL 2 / ANGLE D3D11 / RTX 5080** context. Separate WebGL 1 capability-probe contexts had no measured drawing. The display cadence was approximately 165 Hz; browser battery information said charging and WMI found no battery. This is not the reference laptop or a battery run.

| Persisted tokens | Initially visible during sampling | Pan p50 / p95 | Zoom p50 / p95 | Max draw calls/frame | Max distinct bindings/frame | Fully painted check | Worst load RAF interval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 100 | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 6 | 2 | 3315 ms | 72.7 ms |
| 300 | 72 | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 7 | 33 | 3278 ms | 72.6 ms |
| 1000 | 96 | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 7 | 17 | 4501 ms | 430.3 ms |

The 300- and 1000-token reports are explicitly `over-budget` because their conservative binding proxy exceeds 16; this alone does not establish more than 16 simultaneously sampled textures. All three loads contained intervals exceeding the 30 fps loading floor. No tested count missed the combined pan/zoom p95 threshold on this machine; no exact capacity cliff was established. The readiness numbers include the deliberate network-idle settling check and must not be presented as a perceptual paint measurement.

Initial shell assets totaled 317,669 gzip-equivalent bytes; after loading the map, requested code/styles/fonts totaled 475,821 gzip-equivalent bytes. Peak tracked texture-storage estimates were approximately 1.64 / 8.39 / 6.29 MB; the largest observed texture axis was 256 pixels. JS heap after the cadence samples was approximately 49.9 / 96.2 / 203.0 MB. These are partial memory metrics with the exclusions above. Leaving each view released all tracked textures, ImageBitmaps and pending decodes. The rendering-unavailable case verified all three denied rendering entry points, the product's fallback notice, no mounted canvas, a reader projection of 100 tokens and a keyboard-submitted position change persisted by the server.

The separate two-second allocation windows reported approximately 1.13–1.14 GB of V8-estimated allocation volume, including collected objects, with approximately 957–964 MB attributed to built product-asset frames. This is **not retained heap or process memory**. The calculation sums already weighted `selfSize` values once. Retained call sites include graphics stroke construction, stroke-style normalization and `flatMap`. The baseline renderer's `applyCamera()` cleared/rebuilt grid and line graphics on every camera movement; this is consistent with those sites, but the sampled report is not a complete causal or instrumentation-free attribution. The asset named `CanvasRenderer` contains shared graphics code and does not identify the active renderer. The measured backend identity comes from actual mounted-context draw calls.

Raw reports and screenshots are local, ignored artifacts under `.local/e2e-tactical-performance-final-20260906/`; the final case contains `tactical-performance-summary.json`. Preliminary smoke runs are separate directories and are not the measurements tabulated here. Focused strict TypeScript checking passed. S-K1, S-T1 and G-PERF1 remain open for the explicitly missing workloads, reference hardware and measurement dimensions.

### Measurement calibration investigation

The first run with the cached renderer and M8 appearance, `.local/e2e-tactical-performance-cached-20260906/`, completed 3/4 checks. Its 300-token case expected 32 tile bitmaps after zoom but observed 24 with no pending decodes. That incomplete run is not a full replacement benchmark. Three instrumented 300-token repeats on the unchanged build passed; their fonts were already loaded and their resize histories did not show a late layout shift. The original discrepancy was therefore **not reproduced or attributed to a confirmed font race**.

The investigation did confirm a harness calibration error: it invented a new fit from canvas bounds `1276.96875 × 667.59375`, whereas production initially fitted integer host dimensions `1277 × 668` and then preserved that scale when recentering after its resize delivery. Those are different cameras. The small observed rounding difference alone does not explain 32 versus 24, so the revised harness also records actual control inputs and rejects duplicate/missing zoom steps. Calibration now uses the explicit product fit command and exact observed geometry. It retains the strict tile-count assertion. Diagnostic evidence is preserved under `.local/e2e-tactical-performance-geometry-red-20260906/` and `.local/e2e-tactical-performance-geometry-diagnostic-20260906/`; despite the first directory's exploratory name, all three checks passed.

The first calibrated full run, `.local/e2e-tactical-performance-cached-calibrated-20260906/`, completed 4/4 checks in 1.7 minutes (19:12:55–19:14:27 CEST). Its cadence changed from approximately 6.1 ms during the 100-token pan to approximately 31.3 ms for both 300- and 1000-token samples. The first tested combined-frame-budget miss was 300 tokens; cleanup and exact geometry checks still passed. That run did not include idle controls or per-allocation-window input counts. Host contention or browser scheduling changes were not isolated, so its lower pan allocation volume cannot support a causal before/after ratio. The report is retained with its actual failures; later instrumentation adds the missing controls rather than reclassifying these samples as a pass.

The renderer correction has independent, focused regression evidence: repeated pans retain unchanged wall paths, and a bounded grid window reuses its geometry until coverage changes. Zoom still rebuilds wall strokes to preserve **2 CSS pixels**, batching only adjacent paths of the same color to retain overlap order. The new zoom allocation profile measures that remaining cost separately. These tests establish the corrected operations; a browser allocation-volume comparison alone does not establish their full causal contribution or zero hot-path allocation.

### Final cached-renderer measurement with idle controls

The final coordinated run on 2026-09-06 completed **4/4 functional/collection checks in 2.0 minutes**, from 19:28:08 to 19:30:00 CEST, using `index-C4bNbIAT.js` / `src-DHlPUhqp.js`. No other team browser, build, compilation or full gate ran during that measurement window. It used the same unqualified desktop, Edge 152 headless and the mounted **WebGL 2 / ANGLE D3D11 / RTX 5080** backend, confirmed by actual draw calls. Appearance was `Fantasy`, `comfortable`, with `linear` sampling. The content viewport was `1276.96875 × 667.59375` and the tile-request viewport `1277 × 668`, at DPR 1.

| Persisted tokens | Visible at sample start | Idle before pan p50 | Pan p50 / p95 | Zoom p50 / p95 | Max draws / bindings | Fully painted check | Worst load interval / intervals above 33.33 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 100 | 31.3 ms | 31.2 / 31.6 ms | 31.2 / 31.6 ms | 7 / 3 | 4290 ms | 93.4 ms / 2 |
| 300 | 72 | 31.3 ms | 31.3 / 31.6 ms | 31.2 / 31.6 ms | 8 / 33 | 3715 ms | 62.8 ms / 3 |
| 1000 | 96 | 31.3 ms | 31.2 / 31.6 ms | 31.2 / 31.6 ms | 8 / 17 | 8375 ms | 530.9 ms / 8 |

All three reports are **`over-budget`**: the first tested combined p95 miss is now **100 tokens**. The 300- and 1000-token binding proxies also exceed 16. The idle controls around the camera samples remain approximately 31.2–31.3 ms p50, with the pages visible and focused. Every initial idle control recorded **zero WebGL draw calls**. The slower RAF schedule therefore exists without camera drawing; its exact host/browser scheduling cause remains unknown. It cannot be presented as a renderer-caused regression, or subtracted to manufacture a frame-budget pass. The final Windows inventory also listed a Microsoft Remote Display Adapter at 3840×2160, which was absent from the baseline inventory; both retained the same NVIDIA adapter and driver. That is an observed environment difference, not proof of its scheduling effect. The baseline's approximately 165 Hz schedule and this run's approximately 32 Hz schedule prevent a controlled FPS comparison.

The allocation comparison below uses **product-asset-attributed V8 estimates**, including collected objects, from separate approximately two-second pan windows. Baseline event counts are retained in the baseline report's last probe/teardown snapshot; the new report stores them directly per allocation window. Dividing by actual input count prevents reduced input throughput alone from appearing as reduced cost. These remain instrumented observations across different application builds and scheduling conditions, not a causal A/B estimate.

| Tokens | Baseline pan bytes / inputs | Cached pan bytes / inputs | Baseline / cached pan bytes per input | Cached zoom bytes / inputs | Cached zoom bytes per input |
| --- | --- | --- | --- | --- | --- |
| 100 | 964,019,460 / 330 | 5,838,172 / 64 | 2,921,271 / 91,221 | 96,409,656 / 64 | 1,506,401 |
| 300 | 960,119,416 / 328 | 1,803,380 / 64 | 2,927,193 / 28,178 | 108,423,464 / 64 | 1,694,117 |
| 1000 | 957,305,440 / 329 | 295,000 / 64 | 2,909,743 / 4,609 | 97,646,904 / 61 | 1,600,769 |

The pan windows include real polling, projection updates and tile work when they occur, which explains why this is not an isolated per-pan-method allocation claim. Zoom still shows substantial allocation, with retained call sites for stroke construction, `moveTo` and geometry building. Together with the focused path-reuse regressions, the observations support removal of repeated pan reconstruction while leaving zoom allocation and the full renderer/GPU budgets open. No baseline zoom allocation window was collected, so no before/after zoom allocation ratio is claimed.

Initial shell assets totaled 327,672 gzip-equivalent bytes; all requested code/styles/fonts totaled 485,840 bytes. Peak texture estimates were 1,638,408 / 8,388,616 / 6,291,464 bytes, with a largest texture axis of 256. JS heap after cadence sampling was 22,602,312 / 88,448,408 / 135,821,476 bytes. These retain the partial-memory exclusions above. Exact tile readiness passed at 9 overview bitmaps and 9 / 32 / 24 zoomed bitmaps, with zero pending decodes. No camera sample issued a token-move command. All tracked bitmaps, pending decodes and textures returned to zero after teardown. Reader projection and the real keyboard-submitted DOM fallback command passed.

Reproduction command for this final run, after the focused TypeScript check completed:

```powershell
$env:ATLAS_TACTICAL_PERF = '1'
npx.cmd playwright test e2e/tactical-performance.spec.ts --workers=1 --output .local/e2e-tactical-performance-cached-controlled-20260906 --reporter list
```

The ignored output directory contains each JSON report and screenshot; its `tactical-performance-opt-i-e2db6-M-path-retain-real-commands` subdirectory contains `tactical-performance-summary.json`. Earlier failed, mixed-cadence and diagnostic runs remain separately preserved. This final collection closes neither S-K1, S-T1 nor G-PERF1, and the original isolated 32-versus-24 failure remains unattributed.
