import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

const source = transformSync(readFileSync(new URL("../src/features/MediaPanel.tsx", import.meta.url), "utf8"), { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
/** Exercises the actual component's async handlers with controlled hooks and transport.
 * Browser/SFU integration remains in e2e/media.spec.ts. */
function harness() {
  const slots: any[] = [], rooms: any[] = [], requests: { path: string; method: string; identity: string }[] = [];
  let cursor = 0, changed = false, effects: { i: number; fn: () => unknown }[] = [], tree: any, identity = "old-reader";
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useId: () => "media-panel",
    useRef(initial: unknown) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial: unknown) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  class FakeRoom {
    state = "disconnected"; remoteParticipants = new Map(); canPlaybackAudio = true;
    localParticipant = { identity: "old-reader", name: "Old reader", trackPublications: new Map(), getTrackPublications: () => [], connectionQuality: "good" };
    disconnectGate?: Promise<void>;
    constructor() { rooms.push(this); }
    on() { return this; }
    removeAllListeners() {}
    async connect() { this.state = "connected"; }
    async disconnect() { await this.disconnectGate; this.state = "disconnected"; }
    getActiveDevice() { return ""; }
    static async getLocalDevices() { return []; }
  }
  const snapshot = { configured: true, sessionId: "session", blocked: false, cleanupPending: false, presence: [], rooms: [
    { id: "table", kind: "table", generation: 1, memberIds: [] },
    { id: "whisper", kind: "whisper", generation: 1, memberIds: ["old-reader", "gm"] },
  ] };
  const api = {
    ApiError: class extends Error {}, apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`,
    api: async (path: string, options: { method: string; body?: { roomId?: string } }) => {
      requests.push({ path, method: options.method, identity });
      return path.endsWith("/token") ? { roomId: options.body?.roomId ?? "table", kind: options.body?.roomId ? "whisper" : "table", generation: 1, canPublish: true, token: "opaque-test-grant", url: "ws://localhost" } : { ok: true };
    },
  };
  const element = (type: unknown, props: unknown) => ({ type, props });
  const mod = { exports: {} as any }, document = Object.assign(new EventTarget(), { body: {} });
  runInNewContext(source, {
    module: mod, exports: mod.exports,
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "react-dom") return { createPortal: (value: unknown) => value };
      if (name === "livekit-client") return { Room: FakeRoom, RoomEvent: {}, ConnectionState: { Connected: "connected" }, Track: { Kind: { Audio: "audio", Video: "video" }, Source: { ScreenShare: "screen" } } };
      if (name === "../api") return api;
      if (name === "../hooks") return { useResource: (path: string) => ({ data: path.endsWith("/roster") ? [] : snapshot, error: "", loading: false }) };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
    document, HTMLMediaElement: class {}, DOMException, AbortController,
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 2, clearTimeout: () => {},
  });
  function render() {
    for (let repeat = 0; repeat < 20; repeat++) {
      cursor = 0; effects = []; changed = false;
      tree = mod.exports.MediaPanel({ campaign: { id: "campaign", role: "spieler" }, userId: "old-reader" });
      for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.fn(); }
      if (!changed) return tree;
    }
    throw new Error("Component did not settle");
  }
  const text = (node: any): string => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  function button(label: string) {
    const visit = (node: any): any => {
      if (Array.isArray(node)) { for (const child of node) { const found = visit(child); if (found) return found; } }
      else if (node?.props) { if ((node.type === "button" || node.type === "Button") && (node.props["aria-label"] === label || text(node).trim() === label)) return node; return visit(node.props.children); }
    };
    const result = visit(render()); if (!result) throw new Error(`Button missing: ${label}`); return result;
  }
  async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); render(); }
  function cleanup() { for (const slot of slots) slot?.cleanup?.(); }
  return { render, button, settle, cleanup, rooms, requests, replaceIdentity: () => { identity = "new-reader"; } };
}

describe("media scope teardown", () => {
  it.each(["Flüsterraum betreten", "Verbindung verlassen"])("does not send a late authenticated DELETE after unmount during %s", async action => {
    const h = harness(); h.render(); h.button("Sprache und Video öffnen").props.onClick();
    h.button("Sprachraum beitreten").props.onClick(); await h.settle();
    expect(h.rooms).toHaveLength(1);
    let finish!: () => void;
    h.rooms[0].disconnectGate = new Promise<void>(resolve => { finish = resolve; });
    const before = h.requests.length;
    h.button(action).props.onClick();
    h.cleanup(); h.replaceIdentity(); finish(); await h.settle();
    expect(h.requests.slice(before)).toEqual([]);
  });
});
