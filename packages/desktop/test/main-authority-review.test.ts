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
  const profiles = { list: vi.fn(async () => []), create: vi.fn(), readSetupReceipt: vi.fn(async () => undefined), clearSetupReceipt: vi.fn(async () => undefined) };
  let host!: FakeHost;
  class FakeHost {
    state = "stopped";
    owned: { profile: { id: string } } | undefined;
    ready: { origin: string; setupRequired: boolean; nodeVersion: string; decoder: string } | undefined;
    failure: string | undefined;
    request = vi.fn(async (_kind: string, _payload?: unknown): Promise<unknown> => undefined);
    constructor(_store: unknown, _assets: unknown, _runtime: unknown, readonly changed: () => void) { host = this; }
    async start(id: string) {
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
  vi.doMock("electron", () => ({
    app: Object.assign(new EventEmitter(), { requestSingleInstanceLock: () => true, whenReady: async () => undefined, getPath: () => "C:/test-only-unused-profile", getVersion: () => "test", quit: vi.fn() }),
    BrowserWindow: FakeWindow,
    dialog: { showOpenDialog: openDialog, showMessageBox: vi.fn(async () => ({ response: 0 })) },
    ipcMain: { handle: (name: string, fn: Handler) => handlers.set(name, fn) },
    protocol: { registerSchemesAsPrivileged: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => true, encryptString: vi.fn(), decryptString: vi.fn() },
    session: { fromPartition }, shell: { openExternal: vi.fn() },
    desktopCapturer: { getSources: vi.fn(async () => []) }, Tray: class {}, Menu: {}, nativeImage: {},
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
  return { windows, manager, host, profiles, openDialog, hello, invoke, event, fromPartition };
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
