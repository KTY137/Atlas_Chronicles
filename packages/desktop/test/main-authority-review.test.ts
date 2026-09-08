// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SHELL_URL, partitionFor } from "../src/policy.ts";

type Handler = (event: unknown, envelope?: unknown) => unknown;
type Reply = { ok: boolean; error?: string; value?: unknown };
const localOrigin = "http://localhost:45101";
const remoteOrigin = "https://remote.example";
const profileId = "11111111-1111-4111-8111-111111111111";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}

async function harness() {
  const handlers = new Map<string, Handler>();
  const sessions = new Map<string, ReturnType<typeof makeSession>>();
  function makeSession() {
    return {
      protocol: { handle: vi.fn() },
      webRequest: { onHeadersReceived: vi.fn(), onBeforeRequest: vi.fn() },
      setPermissionCheckHandler: vi.fn(), setPermissionRequestHandler: vi.fn(), setDisplayMediaRequestHandler: vi.fn(),
      cookies: { set: vi.fn(async () => undefined), flushStore: vi.fn(async () => undefined) },
    };
  }
  function fromPartition(name: string) {
    let value = sessions.get(name);
    if (!value) { value = makeSession(); sessions.set(name, value); }
    return value;
  }
  const windows: FakeWindow[] = [];
  class FakeWindow extends EventEmitter {
    destroyed = false;
    url = "";
    webContents: EventEmitter & {
      mainFrame: { url: string }; session: ReturnType<typeof makeSession>; getURL: () => string;
      setWindowOpenHandler: ReturnType<typeof vi.fn>;
    };
    constructor(options: { webPreferences: { partition: string } }) {
      super();
      this.webContents = Object.assign(new EventEmitter(), {
        mainFrame: { url: "" }, session: fromPartition(options.webPreferences.partition),
        getURL: () => this.url, setWindowOpenHandler: vi.fn(),
      });
      windows.push(this);
    }
    removeMenu() {} show() {} focus() {} hide() {}
    isDestroyed() { return this.destroyed; }
    close() { this.destroy(); }
    destroy() { this.destroyed = true; this.emit("closed"); }
    async loadURL(url: string) {
      this.webContents.emit("did-start-navigation", {}, url, false, true);
      this.url = url; this.webContents.mainFrame.url = url;
    }
  }
  const configPath = "C:/test-only-unused-profile/chronist-providers.json";
  const profiles = {
    list: vi.fn(async (): Promise<{ id: string; name: string }[]> => []), create: vi.fn(),
    readSetupReceipt: vi.fn(async () => undefined), clearSetupReceipt: vi.fn(async () => undefined),
    hasChronistKey: vi.fn(async (_id: string) => false),
    saveChronistKey: vi.fn(async (_id: string, _value: string) => undefined),
    clearChronistKey: vi.fn(async (_id: string) => undefined),
    chronistHostConfig: vi.fn(async (_id: string) => ({ key: "synthetic-test-key", configPath })),
  };
  let host!: FakeHost;
  class FakeHost {
    state = "stopped";
    owned: { profile: { id: string } } | undefined;
    ready: { origin: string; setupRequired: boolean; nodeVersion: string; decoder: string } | undefined;
    failure: string | undefined;
    request = vi.fn(async (_kind: string, _payload?: unknown): Promise<unknown> => undefined);
    chronist: unknown;
    constructor(_store: unknown, _assets: unknown, _runtime: unknown, readonly changed: () => void, _migrations?: unknown,
                readonly chronistHostOf?: (profileId: string) => Promise<unknown>) { host = this; }
    async start(id: string) {
      // Production decrypts the profile's Chronist setup here; a missing reader must show up.
      this.chronist = await this.chronistHostOf?.(id);
      this.owned = { profile: { id } };
      this.ready = { origin: localOrigin, setupRequired: true, nodeVersion: "24.test", decoder: "test" };
      this.state = "ready"; this.changed(); return this.ready;
    }
    async stop() {
      this.state = "draining"; this.changed();
      this.state = "stopped"; this.ready = undefined; this.owned = undefined; this.changed();
    }
  }
  const openDialog = vi.fn(async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({ canceled: true, filePaths: [] }));
  const messageDialog = vi.fn(async () => ({ response: 0 }));
  vi.doMock("electron", () => ({
    app: Object.assign(new EventEmitter(), { requestSingleInstanceLock: () => true, whenReady: async () => undefined, getPath: () => "C:/test-only-unused-profile", getVersion: () => "test", quit: vi.fn() }),
    BrowserWindow: FakeWindow,
    dialog: { showOpenDialog: openDialog, showMessageBox: messageDialog },
    ipcMain: { handle: (name: string, fn: Handler) => handlers.set(name, fn) },
    protocol: { registerSchemesAsPrivileged: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => true, encryptString: vi.fn(), decryptString: vi.fn() },
    session: { fromPartition }, shell: { openExternal: vi.fn() },
    Tray: class {}, Menu: {}, nativeImage: {},
  }));
  vi.doMock("../src/profiles.ts", () => ({ ProfileStore: class { constructor() { return profiles; } } }));
  vi.doMock("../src/controller.ts", () => ({ HostController: FakeHost }));
  vi.doMock("../src/recovery.ts", () => ({
    RecoveryStore: class { async list() { return []; } },
    inspectMigrationAdmission: async () => ({ applied: [], pending: [], recoveryRequired: false }),
  }));
  await import("../src/main.ts");
  await vi.waitFor(() => expect(handlers.has("chronicle:manage")).toBe(true));
  const manager = windows[0]!;
  const event = () => ({ sender: manager.webContents, senderFrame: manager.webContents.mainFrame });
  const hello = (sender: unknown = event()) => handlers.get("chronicle:hello")!(sender);
  const invoke = (request: unknown, capability = hello(), sender: unknown = event()) =>
    Promise.resolve(handlers.get("chronicle:manage")!(sender, { capability, request })) as Promise<Reply>;
  return { windows, manager, host, profiles, openDialog, messageDialog, hello, invoke, event, fromPartition };
}

beforeEach(() => vi.resetModules());
afterEach(() => { vi.doUnmock("electron"); vi.doUnmock("../src/profiles.ts"); vi.doUnmock("../src/controller.ts"); vi.doUnmock("../src/recovery.ts"); vi.restoreAllMocks(); });

it("rejects same-origin impostor contents, subframes and an earlier navigation capability", async () => {
  const h = await harness(), capability = h.hello();
  const impostor = { sender: Object.assign(new EventEmitter(), { mainFrame: { url: SHELL_URL } }), senderFrame: h.manager.webContents.mainFrame };
  const child = { sender: h.manager.webContents, senderFrame: { url: SHELL_URL } };
  expect((await h.invoke({ kind: "status" }, capability, impostor)).ok).toBe(false);
  expect((await h.invoke({ kind: "status" }, capability, child)).ok).toBe(false);
  await h.manager.loadURL(SHELL_URL);
  expect((await h.invoke({ kind: "status" }, capability)).ok).toBe(false);
  expect((await h.invoke({ kind: "status" })).ok).toBe(true);
});

it("keeps the native dialog operation locked across status polling and rejects its stale completion", async () => {
  const h = await harness(), selection = deferred<{ canceled: boolean; filePaths: string[] }>();
  h.openDialog.mockReturnValueOnce(selection.promise);
  const selecting = h.invoke({ kind: "restore-select", name: "Isolated test" });
  await vi.waitFor(() => expect(h.openDialog).toHaveBeenCalledOnce());
  expect((await h.invoke({ kind: "status" })).ok).toBe(true);
  expect((await h.invoke({ kind: "remote", origin: remoteOrigin })).ok).toBe(false);
  await h.manager.loadURL(SHELL_URL);
  selection.resolve({ canceled: true, filePaths: [] });
  expect((await selecting).ok).toBe(false);
  expect(h.profiles.create).not.toHaveBeenCalled();
});

it("revokes the local game window before releasing its host origin and preserves remote windows", async () => {
  const h = await harness();
  expect((await h.invoke({ kind: "start", profileId })).ok).toBe(true);
  expect((await h.invoke({ kind: "open" })).ok).toBe(true);
  expect((await h.invoke({ kind: "remote", origin: remoteOrigin })).ok).toBe(true);
  const local = h.windows.find(window => window.url === localOrigin)!;
  const remote = h.windows.find(window => window.url === remoteOrigin)!;
  expect(h.fromPartition(partitionFor(localOrigin))).not.toBe(h.fromPartition(partitionFor(remoteOrigin)));
  expect((await h.invoke({ kind: "stop" })).ok).toBe(true);
  expect(local.isDestroyed(), "A live authenticated window can reload a replacement listener on the released local port").toBe(true);
  expect(remote.isDestroyed()).toBe(false);
});

it("revokes the local game window when the authenticated worker crashes", async () => {
  const h = await harness();
  await h.invoke({ kind: "start", profileId }); await h.invoke({ kind: "open" });
  const local = h.windows.find(window => window.url === localOrigin)!;
  h.host.state = "failed"; h.host.ready = undefined; h.host.changed();
  expect(local.isDestroyed(), "The previous localhost document must lose access when host ownership is lost").toBe(true);
});

it("denies camera, microphone and screen capture in every window without a native prompt", async () => {
  const h = await harness();
  expect((await h.invoke({ kind: "start", profileId })).ok).toBe(true);
  expect((await h.invoke({ kind: "open" })).ok).toBe(true);
  expect((await h.invoke({ kind: "remote", origin: remoteOrigin })).ok).toBe(true);
  for (const window of h.windows) {
    const ses = window.webContents.session;
    const check = ses.setPermissionCheckHandler.mock.calls[0]![0];
    const request = ses.setPermissionRequestHandler.mock.calls[0]![0];
    const display = ses.setDisplayMediaRequestHandler.mock.calls[0]?.[0];
    for (const mediaType of ["audio", "video"]) {
      expect(check(window.webContents, "media", new URL(window.url).origin, { isMainFrame: true, mediaType })).toBe(false);
      const reply = vi.fn();
      request(window.webContents, "media", reply, { isMainFrame: true, requestingUrl: window.url, mediaTypes: [mediaType] });
      expect(reply).toHaveBeenCalledExactlyOnceWith(false);
    }
    expect(display, "Every window session must explicitly reject display capture").toBeTypeOf("function");
    const reply = vi.fn();
    display({ frame: window.webContents.mainFrame, securityOrigin: new URL(window.url).origin, userGesture: true }, reply);
    expect(reply).toHaveBeenCalledExactlyOnceWith({});
  }
  expect(h.messageDialog).not.toHaveBeenCalled();
});

it("retains the committed first-login credential in its bound profile session when the manager reloads", async () => {
  const h = await harness(), receipt = deferred<{ value: string; expiresAt: number }>();
  await h.invoke({ kind: "start", profileId });
  h.host.request.mockReturnValueOnce(receipt.promise);
  const settingUp = h.invoke({ kind: "setup", name: "First GM" });
  await vi.waitFor(() => expect(h.host.request).toHaveBeenCalledWith("setup", { name: "First GM" }));
  await h.manager.loadURL(SHELL_URL);
  // host.setup commits the first identity before its receipt reaches Main. A
  // second bootstrap is now rejected; this receipt is the only first credential.
  receipt.resolve({ value: "test-only-committed-login", expiresAt: Date.now() + 60_000 });
  expect((await settingUp).ok).toBe(false);
  expect(h.fromPartition(partitionFor(localOrigin)).cookies.set).toHaveBeenCalledWith(expect.objectContaining({
    url: localOrigin, value: "test-only-committed-login", httpOnly: true, secure: true,
  }));
  expect(h.fromPartition(partitionFor(localOrigin)).cookies.flushStore).toHaveBeenCalledOnce();
  expect(h.windows).toHaveLength(1);
});

it("hands the private Chronist reader to the controller when a world starts", async () => {
  const h = await harness();
  expect((await h.invoke({ kind: "start", profileId })).ok).toBe(true);
  expect(h.profiles.chronistHostConfig, "Ohne übergebenen Leser bleibt der Schlüssel des Profils wirkungslos").toHaveBeenCalledExactlyOnceWith(profileId);
  expect(h.host.chronist).toEqual({ key: "synthetic-test-key", configPath: "C:/test-only-unused-profile/chronist-providers.json" });
  expect(JSON.stringify(await h.invoke({ kind: "status" })), "Kein Schlüssel in einer Statusantwort").not.toContain("synthetic-test-key");
});

it("stores a Chronist key only for an existing own world and never answers with its value", async () => {
  const h = await harness();
  h.profiles.list.mockResolvedValue([{ id: profileId, name: "Isolated test" }]);
  const stored = await h.invoke({ kind: "chronist-key", profileId, action: "set", value: "synthetic-test-key" });
  expect(stored.ok).toBe(true);
  expect(h.profiles.saveChronistKey).toHaveBeenCalledExactlyOnceWith(profileId, "synthetic-test-key");
  expect(JSON.stringify(stored.value), "Die Antwort ist der gewöhnliche Status ohne Schlüssel").not.toContain("synthetic-test-key");
  // A well-formed but foreign profile is refused before any profile file is touched.
  const foreign = await h.invoke({ kind: "chronist-key", profileId: "22222222-2222-4222-8222-222222222222", action: "set", value: "synthetic-test-key" });
  expect(foreign.ok).toBe(false);
  expect(h.profiles.saveChronistKey).toHaveBeenCalledOnce();
  expect((await h.invoke({ kind: "chronist-key", profileId, action: "clear" })).ok).toBe(true);
  expect(h.profiles.clearChronistKey).toHaveBeenCalledExactlyOnceWith(profileId);
  expect(h.profiles.hasChronistKey, "Der Status fragt nur, ob ein Schlüssel existiert").toHaveBeenCalledWith(profileId);
});
