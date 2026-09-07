// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, it } from "vitest";

const source = transformSync(readFileSync(new URL("../src/features/useCampaignLive.ts", import.meta.url), "utf8"), { loader: "ts", format: "cjs" }).code;

/** Browser-free protocol probe. This exercises the real hook with deterministic hook slots,
 * transports and time; it does not substitute for the React/browser integration tests. */
function harness() {
  let slots: any[] = [], effects: { i: number; fn: () => void | (() => void) }[] = [], cursor = 0, changed = false, value: any;
  let args = ["campaign-a", "reader-a"], now = 0, timerId = 0;
  const timers = new Map<number, { fn: () => void; at: number; period: number }>();
  const websockets: Socket[] = [], requests: any[] = [], outcomes: unknown[] = [];
  const same = (a: unknown[], b: unknown[]) => a && b && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
  const react = {
    useRef(initial: unknown) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial: unknown) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => {
        const update = typeof next === "function" ? next(slots[i].value) : next;
        if (!Object.is(update, slots[i].value)) { slots[i].value = update; changed = true; }
      }];
    },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => void | (() => void), deps: unknown[]) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps, cleanup: old?.cleanup }; effects.push({ i, fn }); }
    },
  };
  class Socket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 0;
    sent: any[] = [];
    url: string;
    onopen?: (event: unknown) => void;
    onclose?: (event: { code: number }) => void;
    onmessage?: (event: { data: string }) => void;
    constructor(url: URL) { this.url = String(url); websockets.push(this); }
    send(data: string) { assert.equal(this.readyState, 1); this.sent.push(JSON.parse(data)); }
    open() { this.readyState = 1; this.onopen?.({}); }
    packet(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }); }
    close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
  }
  class ApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
  const api = {
    ApiError,
    apiPath: (id: string, suffix: string) => `/api/campaigns/${encodeURIComponent(id)}${suffix}`,
    api: async (path: string, options: unknown) => {
      requests.push({ path, ...options as object });
      const outcome = outcomes.shift();
      if (outcome instanceof Error) throw outcome;
      return outcome ?? { id: `message-${requests.length}` };
    },
  };
  const window = new EventTarget(), document = Object.assign(new EventTarget(), { visibilityState: "visible" }), navigator = { onLine: true };
  const timeout = (fn: () => void, delay: number, interval = false) => { const id = ++timerId; timers.set(id, { fn, at: now + delay, period: interval ? delay : 0 }); return id; };
  const mod = { exports: {} as any };
  runInNewContext(source, {
    module: mod, exports: mod.exports, require: (name: string) => name === "react" ? react : api,
    URL, WebSocket: Socket, window, document, navigator, location: { href: "https://atlas.example/?campaign=campaign-a" },
    AbortController, crypto: webcrypto, Date: { now: () => now },
    setTimeout: (fn: () => void, delay: number) => timeout(fn, delay), clearTimeout: (id: number) => timers.delete(id),
    setInterval: (fn: () => void, delay: number) => timeout(fn, delay, true), clearInterval: (id: number) => timers.delete(id),
  });
  function render(next = args) {
    args = next; let loops = 0;
    do {
      assert.ok(++loops < 30, "render stabilizes");
      changed = false; cursor = 0; effects = []; value = mod.exports.useCampaignLive(...args);
      const pending = effects;
      for (const effect of pending) slots[effect.i].cleanup?.();
      for (const effect of pending) slots[effect.i].cleanup = effect.fn();
    } while (changed);
    return value;
  }
  function advance(ms: number) {
    const until = now + ms;
    for (;;) {
      const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due; now = timer.at;
      if (timer.period) timer.at += timer.period; else timers.delete(id);
      timer.fn();
    }
    now = until;
  }
  function cleanup() { for (const slot of slots) slot?.cleanup?.(); }
  function welcome(seq = 8) { const socket = websockets.at(-1)!; socket.open(); socket.packet({ type: "welcome", seq }); return socket; }
  return { render, advance, cleanup, welcome, websockets, requests, outcomes, document, window, navigator, timers };
}

describe("campaign live client protocol", () => {
  it("uses authenticated-origin wss and server presence, sends heartbeat and away state", () => {
    const h = harness();
    try {
      assert.equal(h.render().status, "connecting");
      const socket = h.welcome();
      assert.equal(socket.url, "wss://atlas.example/api/campaigns/campaign-a/live");
      socket.packet({ type: "presence", members: [{ userId: "reader-a", displayName: "Sera", state: "online" }, { userId: 7 }] });
      assert.equal(h.render().status, "connected"); assert.equal(h.render().presence.length, 1);
      h.advance(25_000); assert.ok(socket.sent.some(message => message.type === "ping"));
      h.document.visibilityState = "hidden"; h.document.dispatchEvent(new Event("visibilitychange"));
      assert.equal(socket.sent.at(-1).state, "away");
      h.navigator.onLine = false; h.window.dispatchEvent(new Event("offline"));
      assert.equal(h.render().status, "offline"); assert.equal(h.render().presence.length, 0);
    } finally { h.cleanup(); }
  });

  it("resumes missed invalidations through multiple server pages and ignores duplicates", () => {
    const h = harness();
    try {
      h.render(); const first = h.welcome(); first.packet({ type: "refresh", seq: 9 });
      const revision = h.render().revision;
      first.packet({ type: "refresh", seq: 9 }); assert.equal(h.render().revision, revision);
      first.close(1006); assert.equal(h.render().status, "reconnecting");
      h.advance(1000); const second = h.welcome(300);
      assert.equal(second.sent.at(-1).after, 9);
      second.packet({ type: "refresh", seq: 265 }); second.packet({ type: "resumed", seq: 265 });
      assert.equal(second.sent.at(-1).after, 265);
      second.packet({ type: "refresh", seq: 300 }); second.packet({ type: "resumed", seq: 300 });
      assert.equal(h.render().status, "connected");
    } finally { h.cleanup(); }
  });

  it("retains an uncertain message command across reconnect and coalesces concurrent retries", async () => {
    const h = harness();
    try {
      h.render(); const first = h.welcome(); h.outcomes.push(new Error("lost acknowledgement"));
      await assert.rejects(h.render().sendMessage({ kind: "letter", body: "  A letter  " }), /höchstens einmal/);
      const original = h.requests.at(-1).body.commandId;
      first.close(1006); h.advance(1000); const second = h.welcome(); second.packet({ type: "resumed", seq: 8 });
      await h.render().sendMessage({ kind: "letter", body: "A letter" }); assert.equal(h.requests.at(-1).body.commandId, original);
      await h.render().sendMessage({ kind: "letter", body: "A letter" }); assert.notEqual(h.requests.at(-1).body.commandId, original);
      const firstAttempt = h.render().sendMessage({ kind: "letter", body: "Concurrent" });
      const duplicate = h.render().sendMessage({ kind: "letter", body: "Concurrent" });
      assert.equal(firstAttempt, duplicate); await firstAttempt;
    } finally { h.cleanup(); }
  });

  it("keeps the originally declared table scene on an uncertain retry", async () => {
    const h = harness();
    try {
      h.render(); h.welcome(); h.outcomes.push(new Error("connection interrupted"));
      const draft = { kind: "table", body: "Wait at the door", expectedScene: { id: "scene-a", version: 3 } };
      await assert.rejects(h.render().sendMessage(draft)); const original = h.requests.at(-1).body.commandId;
      await h.render().sendMessage(draft);
      assert.equal(h.requests.at(-1).body.commandId, original);
      assert.equal(h.requests.at(-1).body.expectedScene.id, "scene-a"); assert.equal(h.requests.at(-1).body.expectedScene.version, 3);
      await h.render().sendMessage({ ...draft, expectedScene: { id: "scene-b", version: 2 } });
      assert.notEqual(h.requests.at(-1).body.commandId, original);
    } finally { h.cleanup(); }
  });

  it("isolates campaigns and identities, stops on policy denial, and cleans up all timers", async () => {
    const h = harness();
    h.render(); const first = h.welcome(); const oldSend = h.render().sendMessage;
    first.packet({ type: "presence", members: [{ userId: "reader-a", displayName: "Sera", state: "online" }] });
    let live = h.render(["campaign-b", "reader-b"]);
    assert.equal(live.presence.length, 0); assert.equal(live.revision, 0); assert.equal(first.readyState, 3);
    await assert.rejects(oldSend({ kind: "letter", body: "No cross-campaign send" }), /erneut/);
    const second = h.welcome(1); second.close(1008);
    live = h.render(); assert.equal(live.status, "unavailable");
    const count = h.websockets.length; h.advance(60_000); assert.equal(h.websockets.length, count);
    live.retry(); h.render(); assert.equal(h.websockets.length, count + 1);
    h.cleanup(); assert.equal(h.timers.size, 0);
  });
});
