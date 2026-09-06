/**
 * Does the built client actually RENDER?
 *
 * A bundle that builds is not a bundle that runs. Session -22 saw a served page load its hashed
 * bundle and then die at runtime with `React is not defined` — a white page, which is strictly
 * worse than a placeholder because it looks like a deployment rather than a defect.
 *
 * This serves the real production build over `vite preview` and loads it in headless Edge,
 * failing on: any uncaught exception, any console error, or a body that never gets content.
 * No backend is needed — the shell must render its unauthenticated state on its own, and if it
 * cannot, nothing behind a login will either.
 *
 *   node tools/verify-client-renders.mjs
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const clientDir = join(root, "packages", "client");
const PORT = 4319 + (process.pid % 200);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let preview, browser, socket;
const profile = mkdtempSync(join(tmpdir(), "chronicle-render-check-"));
const fail = (message) => {
  console.error(`RENDER CHECK RED — ${message}`);
  process.exitCode = 1;
};

try {
  // Spawn vite's bin with node directly: a .cmd shim needs a shell on Windows (spawn EINVAL)
  // and a shell makes the child outlive kill().
  const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
  preview = spawn(
    process.execPath,
    [viteBin, "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: clientDir, stdio: "ignore", windowsHide: true },
  );

  let up = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`);
      if (response.ok) { up = true; break; }
    } catch { /* not listening yet */ }
    await delay(500);
  }
  if (!up) throw new Error(`vite preview did not start on ${PORT} — was the client built?`);

  const port = 19500 + (process.pid % 400);
  browser = spawn(
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"],
    { windowsHide: true, stdio: "ignore" },
  );

  let pages;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; }
    catch { await delay(250); }
  }
  const page = pages?.find((t) => t.type === "page");
  if (!page) throw new Error("Edge CDP did not start");

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error("CDP socket failed")); });

  let seq = 0;
  const waiting = new Map();
  const problems = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const cb = waiting.get(message.id);
      if (cb) { waiting.delete(message.id); message.error ? cb.reject(new Error(JSON.stringify(message.error))) : cb.resolve(message.result); }
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      const d = message.params?.exceptionDetails;
      problems.push(`uncaught: ${d?.exception?.description ?? d?.text ?? "unknown"}`.split("\n")[0]);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
      problems.push(`console.error: ${(message.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" ")}`.split("\n")[0]);
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; waiting.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };

  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
  await delay(4000);

  const report = await evaluate(`(() => {
    const root = document.getElementById("root") || document.body;
    return {
      title: document.title,
      rootChildren: root.childElementCount,
      textLength: (root.textContent || "").trim().length,
      hasScript: document.querySelectorAll("script[src]").length,
    };
  })()`);

  console.log(JSON.stringify({ report, problems }, null, 2));

  if (problems.length) fail(`${problems.length} runtime problem(s):\n  - ${problems.join("\n  - ")}`);
  else if (!report.rootChildren) fail("the React root mounted nothing — this is the white-page failure");
  else if (report.textLength < 10) fail(`the root rendered but is empty (${report.textLength} chars of text)`);
  else console.log(`RENDER CHECK GREEN — root has ${report.rootChildren} child element(s), ${report.textLength} chars of text, 0 console errors`);

  await call("Browser.close").catch(() => {});
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  socket?.close();
  browser?.kill();
  preview?.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
