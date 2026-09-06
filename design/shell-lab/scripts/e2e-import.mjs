/**
 * Funktionstest des Live-Imports gegen das echte Eron-Wiki.
 *
 * Das ist der Beweis, dass "Adresse einfuegen und importieren" wirklich
 * funktioniert: echte Netzanfragen aus dem Browser, echte Artikel im Bestand.
 * Der Test schreibt nichts in fremde Systeme - MediaWiki wird nur gelesen.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:4174";
const artifacts = path.resolve("artifacts");
const profile = path.join(artifacts, `.import-profile-${process.pid}`);
const port = 9500 + (process.pid % 200);
mkdirSync(artifacts, { recursive: true });

const edge = spawn(
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
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
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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
      for (const listener of this.#events.get(message.method) ?? []) listener(message.params);
    });
  }
  send(method, params = {}) {
    const id = ++this.#id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
  }
  once(method) {
    return new Promise((resolve) => {
      const listener = (params) => {
        this.#events.set(method, (this.#events.get(method) ?? []).filter((x) => x !== listener));
        resolve(params);
      };
      this.#events.set(method, [...(this.#events.get(method) ?? []), listener]);
    });
  }
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  - ${detail}` : ""}`);
};

let socket;
try {
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break;
    } catch {
      /* Edge startet noch. */
    }
    await delay(100);
  }
  const tab = await (
    await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(BASE)}`, { method: "PUT" })
  ).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await once(socket, "open");
  const cdp = new Cdp(socket);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const go = async (url) => {
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await loaded;
    await delay(700);
  };
  const run = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        `${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description ?? ""}`,
      );
    }
    return result.result.value;
  };
  const lower = (s) =>
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(String(s).toLowerCase())})`;
  const clickByText = (selector, text) =>
    run(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.includes(${JSON.stringify(text)})).click()`,
    );
  const waitFor = async (expression, timeoutMs, label) => {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      if (await run(expression)) return true;
      await delay(500);
    }
    console.log(`   (Zeitueberschreitung: ${label})`);
    return false;
  };

  await go(`${BASE}/`);
  await run(`localStorage.removeItem("chronicle.shell-lab.wiki.v1")`);

  /* 1 - Importflaeche erreichbar */
  await go(`${BASE}/?stage=welt&welt=import`);
  check("Importflaeche oeffnet", await run(`!!document.querySelector(".import-field input")`));

  /* 2 - Adresse pruefen: echte Netzanfrage gegen die MediaWiki-API */
  await run(`(() => {
    const el = document.querySelector(".import-field input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, "https://eron.fandom.com/de");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await clickByText("button", "Wiki pruefen").catch(() => clickByText("button", "Wiki prüfen"));
  const probed = await waitFor(lower("gefunden"), 25000, "Probe-Antwort");
  check("Wiki wird ueber die API gefunden", probed);
  if (probed) {
    const facts = await run(`document.querySelector(".import-facts")?.innerText.replace(/\\n/g, " | ") ?? ""`);
    console.log(`   ${facts}`);
    check("Lizenz wird ausgewiesen", /CC.?BY.?SA/i.test(facts), "Rechtehinweis aus rightsinfo");
    check("Endpunkt wurde selbst ermittelt", /api\.php/.test(facts));
  }

  /* 3 - wirklich importieren */
  await clickByText("button", "Artikel importieren");
  const done = await waitFor(lower("sind da"), 90000, "Import-Abschluss");
  check("Import laeuft durch", done);
  if (done) {
    const summary = await run(`document.querySelector(".import-card.ok")?.innerText.replace(/\\n/g, " | ") ?? ""`);
    console.log(`   ${summary.slice(0, 160)}`);
  }

  /* 4 - der Bestand ist wirklich gewachsen und stammt aus dem Live-Import */
  const stored = await run(`(() => {
    const raw = JSON.parse(localStorage.getItem("chronicle.shell-lab.wiki.v1") || "{}");
    const values = Object.values(raw);
    return {
      total: values.length,
      withOrigin: values.filter((a) => a.origin).length,
      sample: values.find((a) => a.origin)?.origin ?? null,
    };
  })()`);
  check("Artikel liegen mit Herkunft im Bestand", stored.withOrigin > 50, `${stored.withOrigin} von ${stored.total}`);
  check(
    "Herkunft traegt Quelle, Lizenz und Revision",
    Boolean(stored.sample?.source && stored.sample?.license && stored.sample?.revision),
    JSON.stringify(stored.sample),
  );

  /* 5 - importierte Artikel sind lesbar und tragen die Lizenz sichtbar */
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent("Olav der Ehrliche")}`);
  check("Importierter Artikel rendert", await run(`document.querySelectorAll(".article p").length > 3`));
  check(
    "Lizenz steht am Artikel",
    await run(lower("cc-by-sa")) || await run(lower("cc by-sa")),
    await run(`document.querySelector(".attribution")?.textContent ?? ""`),
  );

  /* 6 - Live-Import laesst sich verwerfen, Eigenes bleibt */
  await run(`(() => {
    const raw = JSON.parse(localStorage.getItem("chronicle.shell-lab.wiki.v1") || "{}");
    raw["Selbst Geschrieben"] = { title: "Selbst Geschrieben", wikitext: "'''Selbst Geschrieben''' bleibt.", created: true, editedAt: "2026-09-06" };
    localStorage.setItem("chronicle.shell-lab.wiki.v1", JSON.stringify(raw));
    return true;
  })()`);
  await go(`${BASE}/?stage=welt&welt=import`);
  await clickByText("button", "Live-Import verwerfen");
  await delay(900);
  const after = await run(`(() => {
    const raw = JSON.parse(localStorage.getItem("chronicle.shell-lab.wiki.v1") || "{}");
    const values = Object.values(raw);
    return { withOrigin: values.filter((a) => a.origin).length, own: values.filter((a) => a.created).length };
  })()`);
  check("Verwerfen entfernt nur den Live-Import", after.withOrigin === 0 && after.own === 1, JSON.stringify(after));

  await run(`localStorage.removeItem("chronicle.shell-lab.wiki.v1")`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} bestanden`);
  process.exitCode = failed.length ? 1 : 0;
} finally {
  socket?.close();
  edge.kill();
  await Promise.race([once(edge, "exit"), delay(3000)]);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* Profil bleibt liegen; nicht kritisch. */
  }
}
