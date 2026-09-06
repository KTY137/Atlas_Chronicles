// Maintainer-only fixture capture. Uses installed Edge and native CDP, no generator is bundled.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const output = fileURLToPath(new URL("../test/fixtures/", import.meta.url));
mkdirSync(output, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "chronicle-azgaar-fixture-"));
const downloads = mkdtempSync(join(tmpdir(), "chronicle-azgaar-download-"));
const port = 19000 + Math.floor(Math.random() * 10000);
const url = "https://azgaar.github.io/Fantasy-Map-Generator/?seed=chronicle-import-fixture-2026&width=640&height=480";
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, url,
], { windowsHide: true, stdio: "ignore" });
let socket;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let pages;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; }
    catch { await delay(250); }
  }
  const page = pages?.find((target) => target.type === "page");
  if (!page) throw new Error("Edge CDP page did not start");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const waiting = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const callbacks = waiting.get(message.id);
      if (callbacks) {
        waiting.delete(message.id);
        if (message.error) callbacks.reject(new Error(JSON.stringify(message.error)));
        else callbacks.resolve(message.result);
      }
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    waiting.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call("Page.enable");
  await call("Network.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 640, height: 480, deviceScaleFactor: 1, mobile: false });
  await call("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  await delay(2000); // let Edge's startup navigation settle before navigating the capture tab
  console.log(JSON.stringify({ page: await evaluate("location.href") }));
  let ready = false;
  for (let attempt = 0; attempt < 180; attempt++) {
    ready = await evaluate("Boolean(window.pack && window.pack.burgs && window.pack.burgs.length > 1 && window.mapId)");
    if (ready) break;
    await delay(1000);
  }
  if (!ready) throw new Error(`Generator did not become ready: ${await evaluate("JSON.stringify({url:location.href,html:document.documentElement.outerHTML.slice(0,1000)})")}`);
  const buttons = await evaluate("Array.from(document.querySelectorAll('button')).filter(b => /full/i.test(b.textContent)).map(b=>({id:b.id,text:b.textContent}))");
  console.log(JSON.stringify({ ready, buttons }));
  const full = buttons.find((b) => b.text.trim().toLowerCase() === "full");
  if (!full) throw new Error("Full export button was not found");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toLowerCase() === 'full').click()");
  let file;
  for (let attempt = 0; attempt < 30; attempt++) {
    file = readdirSync(downloads).find((f) => f.endsWith(".json") && /Full/i.test(f));
    if (file) break;
    await delay(1000);
  }
  if (!file) throw new Error("Full export download did not complete");
  const bytes = readFileSync(join(downloads, file));
  const parsed = JSON.parse(bytes.toString("utf8"));
  writeFileSync(join(output, "azgaar-full.json.gz"), gzipSync(bytes, { level: 9 }));
  const manifest = {
    capturedAt: new Date().toISOString(), sourceUrl: url, method: "Unmodified Full JSON download through Azgaar's own export button in headless Microsoft Edge",
    originalFilename: file, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length,
    info: parsed.info, counts: { cells: parsed.pack.cells.length, burgs: parsed.pack.burgs.filter(b => b?.i && !b.removed).length },
    rightsSource: "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Knowledge-Base#who-owns-the-maps-created",
    scope: "Generated output data only; no generator scripts, SVG, fonts, coats-of-arms assets or bundled third-party code.",
  };
  writeFileSync(join(output, "provenance.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify(manifest, null, 2));
  await call("Browser.close").catch(() => {});
} finally {
  socket?.close();
  browser.kill();
  console.log(`Capture browser profile retained at ${profile}`);
}
