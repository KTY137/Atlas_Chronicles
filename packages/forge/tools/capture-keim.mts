/**
 * Gate K-G2 · `S-G1 · Der Keim` — evidence capture.
 *
 * Maintainer-only. Drives a REAL headless Azgaar run through the generator's own export
 * button, feeds the bytes to our real importer, and writes a compact **evidence digest** —
 * not the 8 MB payload. The digest is what the gate asserts against; the source sha256 is
 * recorded so any claim in it can be re-audited later.
 *
 * Why a digest and not another fixture: `test/fixtures/azgaar-full.json.gz` is already 2 MB
 * compressed. S-G1 needs several runs to say anything, and a gate that costs 2 MB of repo per
 * assertion is a gate nobody will re-run.
 *
 * What S-G1 actually asks, stated precisely, because it is easy to get wrong:
 *   Two SEPARATE generator runs of the same seed AND the same option vector must yield
 *   identical `keimHash` and identical `KnotenId`s. Re-parsing one recorded file twice proves
 *   only that our parser is deterministic; it says nothing about the generator.
 *
 * What S-G1 does NOT ask: that ids survive a CHANGED option vector. They must not, and ours
 * do not — `width`/`height` are inside the `Weltkeim`, so a different canvas is a different
 * world with different ids. That is the ruling, not a defect: RB-21d:234 measured that the
 * same seed at a different canvas keeps `(id, name)` for **0 of 664 burgs**, which is exactly
 * why the option vector belongs in the hash. This tool captures that case too, so the claim is
 * measured here rather than inherited.
 *
 * Usage:
 *   npx tsx packages/forge/tools/capture-keim.mts --label a --seed <s> --width 640 --height 480
 *
 * No generator code is vendored, forked or shipped. We run it unmodified and consume its
 * export (RB-20:415, refusal 8). Only generated OUTPUT DATA is retained — no scripts, SVG,
 * fonts, coats-of-arms assets or bundled third-party code, because Azgaar can only grant what
 * is his: the bundled art is not (RB-21c:53-59).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { importiereAzgaar } from "../src/index.ts";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]?.replace(/^--/, "");
  const value = process.argv[i + 1];
  if (key && value) args.set(key, value);
}
const label = args.get("label") ?? "a";
const seed = args.get("seed") ?? "chronicle-import-fixture-2026";
const width = Number(args.get("width") ?? 640);
const height = Number(args.get("height") ?? 480);

const outDir = fileURLToPath(new URL("../test/fixtures/", import.meta.url));
mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "chronicle-keim-profile-"));
const downloads = mkdtempSync(join(tmpdir(), "chronicle-keim-download-"));
const port = 19000 + Math.floor(Math.random() * 10000);
const url = `https://azgaar.github.io/Fantasy-Map-Generator/?seed=${encodeURIComponent(seed)}&width=${width}&height=${height}`;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = spawn(
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, url,
  ],
  { windowsHide: true, stdio: "ignore" },
);

let socket: WebSocket | undefined;
try {
  let pages: { type: string; webSocketDebuggerUrl: string }[] | undefined;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      pages = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as typeof pages;
      break;
    } catch {
      await delay(250);
    }
  }
  const page = pages?.find((t) => t.type === "page");
  if (!page) throw new Error("Edge CDP page did not start");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket!.onopen = () => resolve();
    socket!.onerror = () => reject(new Error("CDP socket failed"));
  });

  let sequence = 0;
  const waiting = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id) return;
    const cb = waiting.get(message.id);
    if (!cb) return;
    waiting.delete(message.id);
    if (message.error) cb.reject(new Error(JSON.stringify(message.error)));
    else cb.resolve(message.result);
  };
  const call = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<any>((resolve, reject) => {
      const id = ++sequence;
      waiting.set(id, { resolve, reject });
      socket!.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression: string) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };

  await call("Page.enable");
  await call("Network.enable");
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await call("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  await delay(2000);

  let ready = false;
  for (let attempt = 0; attempt < 180; attempt++) {
    ready = await evaluate("Boolean(window.pack && window.pack.burgs && window.pack.burgs.length > 1 && window.mapId)");
    if (ready) break;
    await delay(1000);
  }
  if (!ready) throw new Error("Generator did not become ready");

  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toLowerCase() === 'full').click()",
  );
  let file: string | undefined;
  for (let attempt = 0; attempt < 30; attempt++) {
    file = readdirSync(downloads).find((f) => f.endsWith(".json") && /Full/i.test(f));
    if (file) break;
    await delay(1000);
  }
  if (!file) throw new Error("Full export download did not complete");

  const bytes = readFileSync(join(downloads, file));
  const json = bytes.toString("utf8");
  const imported = importiereAzgaar(json);

  // The digest. Sorted by id so the file is stable and diffable; `titel` is carried so the
  // canvas-change case can measure NAME survival separately from ID survival.
  const knoten = imported.knoten
    .map((n) => ({ id: n.id as string, art: n.art, titel: n.titel }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const digest = {
    label,
    capturedAt: new Date().toISOString(),
    sourceUrl: url,
    method: "Unmodified Full JSON download through Azgaar's own export button in headless Microsoft Edge",
    originalFilename: file,
    source: { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length },
    info: { version: imported.keim.version, seed: imported.keim.seed, mapName: imported.titel, width, height },
    keimHash: imported.keim.keimHash,
    counts: { knoten: imported.knoten.length, orte: imported.orte.length, zellen: imported.zellen.length },
    ortNamen: imported.orte.map((o) => o.name).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    knoten,
    rightsSource:
      "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Knowledge-Base#who-owns-the-maps-created",
    scope:
      "Generated output data only; no generator scripts, SVG, fonts, coats-of-arms assets or bundled third-party code.",
  };

  writeFileSync(join(outDir, `keim-${label}.json`), JSON.stringify(digest, null, 2) + "\n");
  console.log(
    JSON.stringify(
      { label, keimHash: digest.keimHash, counts: digest.counts, sha256: digest.source.sha256 },
      null,
      2,
    ),
  );
  await call("Browser.close").catch(() => {});
} finally {
  socket?.close();
  browser.kill();
}
