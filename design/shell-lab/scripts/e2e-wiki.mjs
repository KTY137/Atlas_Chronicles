/**
 * Funktionstest der Welt-Buehne ueber das DevTools-Protokoll:
 * lesen, bearbeiten, speichern, neu laden, Keim anlegen, suchen.
 *
 * Das ist der Unterschied zwischen "sieht fertig aus" und "funktioniert":
 * jeder Schritt wird im echten Browser ausgefuehrt und das Ergebnis gelesen.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:4174";
const artifacts = path.resolve("artifacts");
const profile = path.join(artifacts, `.e2e-profile-${process.pid}`);
const port = 9800 + (process.pid % 300);
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
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  - ${detail}` : ""}`);
};

const MARKER = `ChronicleTest${Date.now()}`;
const NEW_TITLE = "Ein Ganz Neuer Ort";

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
  const tabResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(BASE)}`,
    { method: "PUT" },
  );
  const tab = await tabResponse.json();
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
  const lower = (s) => `document.body.innerText.toLowerCase().includes(${JSON.stringify(String(s).toLowerCase())})`;
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
  const clickByText = (selector, text) =>
    run(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.includes(${JSON.stringify(text)})).click()`,
    );
  const setFieldValue = (selector, proto, value) =>
    run(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const setter = Object.getOwnPropertyDescriptor(window.${proto}.prototype, "value").set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);

  /* Sauber starten: kein Rest aus einem frueheren Lauf. */
  await go(`${BASE}/`);
  await run(`localStorage.removeItem("chronicle.shell-lab.wiki.v1")`);

  /* 1 - Verzeichnis */
  await go(`${BASE}/?stage=welt&welt=index`);
  const stats = await run(`document.querySelector(".index-stats")?.textContent ?? ""`);
  check("Verzeichnis zeigt Korpusstatistik", /\d+\s*Artikel/.test(stats), stats.trim().slice(0, 100));
  const itemCount = await run(`document.querySelectorAll(".index-item").length`);
  check("Verzeichnis listet den ganzen Korpus", itemCount > 70, `${itemCount} Eintraege`);

  /* 2 - Artikel lesen */
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent("Olav der Ehrliche")}`);
  const linkCount = await run(`document.querySelectorAll(".article .link").length`);
  const redCount = await run(`document.querySelectorAll(".article .link.red").length`);
  check("Artikel rendert Verweise", linkCount > 30, `${linkCount} Links, davon ${redCount} rot`);
  const backlinkCount = await run(`document.querySelectorAll(".backlinks .chip").length`);
  check("Artikel zeigt Backlinks", backlinkCount > 0, `${backlinkCount} Backlinks`);

  /* 3 - bearbeiten und speichern */
  await clickByText(".chip", "Bearbeiten");
  await delay(400);
  check("Editor oeffnet mit Wikitext", await run(`!!document.querySelector("textarea.editor")`));

  const original = await run(`document.querySelector("textarea.editor").value`);
  await setFieldValue(
    "textarea.editor",
    "HTMLTextAreaElement",
    `${original}\n\n== Pruefabschnitt ==\n${MARKER} mit [[${NEW_TITLE}]].\n`,
  );
  await delay(200);
  await clickByText("button", "Speichern");
  await delay(600);
  check("Speichern zeigt den neuen Text sofort", await run(`document.body.innerText.includes("${MARKER}")`));

  /* 4 - Persistenz */
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent("Olav der Ehrliche")}`);
  check("Aenderung ueberlebt das Neuladen", await run(`document.body.innerText.includes("${MARKER}")`));
  check(
    "Artikel ist als lokal bearbeitet markiert",
    await run(lower("lokal bearbeitet")),
  );

  /* 5 - Keim ist deep-linkbar (Regressionsschutz gegen stillen Rückfall) */
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent(NEW_TITLE)}`);
  check(
    "Unbekannter Titel per URL zeigt die Keim-Ansicht",
    await run(lower("noch kein Artikel")),
  );
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent("Olav der Ehrliche")}`);

  /* 6 - neuer roter Link, Keim anlegen */
  const hasRed = await run(
    `!![...document.querySelectorAll(".article .link.red")].find((a) => a.textContent === ${JSON.stringify(NEW_TITLE)})`,
  );
  check("Neuer Verweis erscheint als roter Keim", hasRed);

  await run(
    `[...document.querySelectorAll(".article .link.red")].find((a) => a.textContent === ${JSON.stringify(NEW_TITLE)}).click()`,
  );
  await delay(400);
  check("Roter Link oeffnet die Keim-Ansicht", await run(lower("noch kein Artikel")));

  await clickByText("button", "Artikel anlegen");
  await delay(700);
  check(
    "Keim wird zu einem echten Artikel",
    await run(lower("in Chronicle entstanden")),
  );
  check(
    "Neuer Artikel zeigt den Backlink auf Olav",
    await run(
      `[...document.querySelectorAll(".backlinks .chip")].some((c) => c.textContent.includes("Olav der Ehrliche"))`,
    ),
  );

  /* 6 - der Link ist jetzt gruen */
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent("Olav der Ehrliche")}`);
  const stillRed = await run(
    `!![...document.querySelectorAll(".article .link.red")].find((a) => a.textContent === ${JSON.stringify(NEW_TITLE)})`,
  );
  check("Der Keim ist kein roter Link mehr", stillRed === false);

  /* 7 - Suche */
  await go(`${BASE}/?stage=welt&palette=1`);
  await setFieldValue(".palette-input input", "HTMLInputElement", "Ganz Neuer");
  await delay(400);
  check("Suche findet den neu angelegten Artikel", await run(`document.body.innerText.includes(${JSON.stringify(NEW_TITLE)})`));

  await setFieldValue(".palette-input input", "HTMLInputElement", "Blechorgel");
  await delay(400);
  const hits = await run(`document.querySelectorAll(".palette-hit").length`);
  check("Volltextsuche liefert Treffer", hits > 0, `${hits} Treffer fuer "Blechorgel"`);

  /* 8 - zuruecksetzen */
  await go(`${BASE}/?stage=welt&artikel=${encodeURIComponent("Olav der Ehrliche")}`);
  await clickByText(".chip", "Import wiederherstellen");
  await delay(600);
  check(
    "Import laesst sich wiederherstellen",
    (await run(`document.body.innerText.includes("${MARKER}")`)) === false,
  );

  /* Aufraeumen, damit Screenshots den reinen Importzustand zeigen. */
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
