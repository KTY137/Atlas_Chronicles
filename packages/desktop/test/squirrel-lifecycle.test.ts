// Electron's packaged executable carries Squirrel's `SquirrelAwareVersion` resource, verified
// on the actual artifact. Squirrel therefore hands the shortcut to us and creates none itself,
// so a lifecycle branch that only quits installs an application nobody can find. These cases
// pin the handover and, just as importantly, that it never opens a profile.
import { EventEmitter } from "node:events";
import { basename, join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const updater = join(process.execPath, "..", "..", "Update.exe");

async function boot(argument: string, { updaterPresent = true } = {}) {
  const spawnSync = vi.fn(() => ({ status: 0 }));
  const quit = vi.fn();
  const handle = vi.fn();
  const windows: unknown[] = [];
  const requestSingleInstanceLock = vi.fn(() => true);
  vi.stubGlobal("process", Object.assign(Object.create(process), { argv: [process.execPath, "app", argument] }));
  vi.doMock("node:child_process", async () => ({ ...(await vi.importActual<typeof import("node:child_process")>("node:child_process")), spawnSync }));
  vi.doMock("node:fs", async () => ({ ...(await vi.importActual<typeof import("node:fs")>("node:fs")), existsSync: (path: string) => (path === updater ? updaterPresent : true) }));
  vi.doMock("electron", () => ({
    app: Object.assign(new EventEmitter(), { requestSingleInstanceLock, whenReady: async () => undefined, getPath: () => "C:/test-only-unused-profile", getVersion: () => "test", quit, setPath: vi.fn() }),
    BrowserWindow: class { constructor() { windows.push(this); } },
    dialog: {}, ipcMain: { handle }, protocol: { registerSchemesAsPrivileged: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => true }, session: { fromPartition: () => ({}) },
    shell: {}, desktopCapturer: {}, Tray: class {}, Menu: {}, nativeImage: {},
  }));
  vi.doMock("../src/profiles.ts", () => ({ ProfileStore: class {} }));
  vi.doMock("../src/controller.ts", () => ({ HostController: class {} }));
  vi.doMock("../src/recovery.ts", () => ({ RecoveryStore: class {}, inspectMigrationAdmission: async () => ({ applied: [], pending: [], recoveryRequired: false }) }));
  await import("../src/main.ts");
  return { spawnSync, quit, handle, windows, requestSingleInstanceLock };
}

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  for (const id of ["node:child_process", "node:fs", "electron", "../src/profiles.ts", "../src/controller.ts", "../src/recovery.ts"]) vi.doUnmock(id);
  vi.restoreAllMocks();
});

it("creates the shortcut on install and on update, from its own installed layout", async () => {
  for (const argument of ["--squirrel-install", "--squirrel-updated"]) {
    vi.resetModules();
    const boot1 = await boot(argument);
    expect(boot1.spawnSync).toHaveBeenCalledWith(updater, [`--createShortcut=${basename(process.execPath)}`], expect.objectContaining({ windowsHide: true }));
    expect(boot1.quit).toHaveBeenCalled();
    vi.unstubAllGlobals();
  }
});

it("removes the shortcut on uninstall and touches no updater when obsolete", async () => {
  const removal = await boot("--squirrel-uninstall");
  expect(removal.spawnSync).toHaveBeenCalledWith(updater, [`--removeShortcut=${basename(process.execPath)}`], expect.objectContaining({ windowsHide: true }));
  vi.unstubAllGlobals();
  vi.resetModules();
  const obsolete = await boot("--squirrel-obsolete");
  expect(obsolete.spawnSync).not.toHaveBeenCalled();
  expect(obsolete.quit).toHaveBeenCalled();
});

it("never opens a profile, a window or the single-instance lock during an installer event", async () => {
  const installing = await boot("--squirrel-install");
  expect(installing.windows).toHaveLength(0);
  expect(installing.handle).not.toHaveBeenCalled();
  expect(installing.requestSingleInstanceLock).not.toHaveBeenCalled();
});

it("still quits when the updater is absent, so a lost shortcut cannot strand an installation", async () => {
  const missing = await boot("--squirrel-install", { updaterPresent: false });
  expect(missing.spawnSync).not.toHaveBeenCalled();
  expect(missing.quit).toHaveBeenCalled();
});
