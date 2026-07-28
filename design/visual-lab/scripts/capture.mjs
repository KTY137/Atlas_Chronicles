import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const [url, outputArg, widthArg = "1600", heightArg = "1000"] =
  process.argv.slice(2);

if (!url || !outputArg) {
  console.error(
    "Usage: node scripts/capture.mjs <url> <output.png> [width] [height]",
  );
  process.exit(2);
}

const width = Number.parseInt(widthArg, 10);
const height = Number.parseInt(heightArg, 10);
const output = path.resolve(outputArg);
const artifactsRoot = path.resolve("artifacts");
const profile = path.join(artifactsRoot, `.capture-profile-${process.pid}`);
const port = 9300 + (process.pid % 500);
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

mkdirSync(artifactsRoot, { recursive: true });

if (!profile.startsWith(`${artifactsRoot}${path.sep}`)) {
  throw new Error(`Refusing profile outside artifacts: ${profile}`);
}

const edge = spawn(
  edgePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Edge is still starting.
    }
    await delay(100);
  }
  throw new Error("Edge DevTools endpoint did not start");
}

class Cdp {
  #id = 0;
  #pending = new Map();
  #events = new Map();

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.#pending.get(message.id);
        if (!pending) return;
        this.#pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const listeners = this.#events.get(message.method) ?? [];
      for (const listener of listeners) listener(message.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.#id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const listener = (params) => {
        const listeners = this.#events.get(method) ?? [];
        this.#events.set(
          method,
          listeners.filter((candidate) => candidate !== listener),
        );
        resolve(params);
      };
      const listeners = this.#events.get(method) ?? [];
      this.#events.set(method, [...listeners, listener]);
    });
  }
}

let socket;

try {
  await waitForDebugger();
  const tabResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" },
  );
  const tab = await tabResponse.json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await once(socket, "open");

  const cdp = new Cdp(socket);
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 600,
    screenWidth: width,
    screenHeight: height,
  });

  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url });
  await loaded;
  await delay(1200);

  const metrics = await cdp.send("Runtime.evaluate", {
    expression:
      "({width: innerWidth, height: innerHeight, dpr: devicePixelRatio})",
    returnByValue: true,
  });
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  writeFileSync(output, Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify({ output, viewport: metrics.result.value }));
} finally {
  socket?.close();
  edge.kill();
  await Promise.race([once(edge, "exit"), delay(3000)]);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    console.warn(`Temporary Edge profile remains: ${profile}`);
  }
}
