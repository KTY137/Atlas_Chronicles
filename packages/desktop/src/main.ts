// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { app, BrowserWindow, dialog, ipcMain, protocol, safeStorage, session, shell, Tray, Menu, nativeImage, type IpcMainInvokeEvent } from "electron";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, copyFile, mkdir, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Authority, DesktopError, SHELL_URL, command, fail, object, partitionFor } from "./policy.ts";
import { originOf, ProfileStore } from "./profiles.ts";
import { HostController } from "./controller.ts";
import { RecoveryStore, inspectMigrationAdmission, type RecoveryManifest } from "./recovery.ts";

protocol.registerSchemesAsPrivileged([{ scheme: "chronicle-shell", privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false } }]);
const assets = fileURLToPath(new URL("./", import.meta.url));
const userDataFlag = process.argv.find(value => value.startsWith("--user-data="));
if (userDataFlag) {
  // An explicit test launch is confined to the disposable test namespace, also
  // for the unpacked Windows artifact. Renderer IPC never accepts this option.
  const path = resolve(userDataFlag.slice("--user-data=".length));
  if (!path.toLowerCase().includes(`${join(".local", "desktop-profiles").toLowerCase()}${process.platform === "win32" ? "\\" : "/"}`)) throw new Error("Development userData must use an isolated desktop-profiles child.");
  app.setPath("userData", path);
}
// Installer events are handled before opening any profile. Electron's executable carries
// Squirrel's `SquirrelAwareVersion` resource, so Squirrel delegates the shortcut to the
// application and creates none itself: without this branch an installed world has no start
// menu entry at all. The update binary is resolved from our own installed layout, never from
// an argument, and a missing or failing one costs a shortcut, never the installation.
const lifecycle = process.argv.find(value => /^--squirrel-(install|updated|uninstall|obsolete)$/.test(value));
if (lifecycle) {
  const shortcut = lifecycle === "--squirrel-uninstall" ? "--removeShortcut" : lifecycle === "--squirrel-obsolete" ? undefined : "--createShortcut";
  const updater = join(process.execPath, "..", "..", "Update.exe");
  if (shortcut && existsSync(updater)) try { spawnSync(updater, [`${shortcut}=${basename(process.execPath)}`], { windowsHide: true, timeout: 10_000 }); } catch { /* the installation stands; only its shortcut is lost */ }
  app.quit();
}
else if (!app.requestSingleInstanceLock()) app.quit();
else void app.whenReady().then(run);

async function run() {
  if (process.platform !== "win32" || process.arch !== "x64") throw new Error("This desktop runtime supports Windows x64 only.");
  const authority = new Authority();
  let capability = randomUUID(), manager: BrowserWindow, tray: Tray | undefined, quitting = false, busy = false;
  const games = new Set<BrowserWindow>();
  const localGames = new Map<BrowserWindow, string>();
  const revokeLocalWindows = () => {
    for (const [window] of [...localGames]) if (!window.isDestroyed()) window.destroy();
    localGames.clear();
  };
  const box = { available: () => safeStorage.isEncryptionAvailable(), encrypt: (text: string) => safeStorage.encryptString(text), decrypt: (bytes: Buffer) => safeStorage.decryptString(bytes) };
  const store = new ProfileStore(app.getPath("userData"), box);
  const recovery = new RecoveryStore(app.getPath("userData"), join(assets, "runtime"), assets, box);
  let lastState = "stopped";
  const host = new HostController(store, assets, join(assets, "runtime"), () => {
    // Revoke authenticated documents synchronously at the beginning of drain,
    // before the loopback listener can be released to a replacement process.
    if (host.state === "draining" || host.state === "failed") revokeLocalWindows();
    if (host.state === "failed" && lastState !== "failed") authority.navigate();
    lastState = host.state;
    tray?.setToolTip(`Atlas Chronicles – ${host.state}`);
  }, { beforeSchema: async (owned, postgres) => {
    const admission = await inspectMigrationAdmission(owned, assets);
    if (admission.recoveryRequired) await recovery.create(owned, postgres, app.getVersion());
  } }, id => store.chronistHostConfig(id));
  let restore: { ticket: string; path: string; profileId: string; report: unknown; gms: unknown; assert: () => void } | undefined;
  session.fromPartition("chronicle-management").protocol.handle("chronicle-shell", async request => {
    const url = new URL(request.url);
    const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (url.host !== "app" || url.search || !["index.html", "manager.js", "manager.css"].includes(name)) return new Response("Not found", { status: 404 });
    return new Response(await readFile(join(assets, "manager", name)), { headers: {
      "Content-Type": name.endsWith(".js") ? "text/javascript; charset=utf-8" : name.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
    } });
  });
  manager = new BrowserWindow({ width: 1080, height: 800, minWidth: 560, minHeight: 640, title: "Atlas Chronicles – Lokale Welten", backgroundColor: "#121a1d", webPreferences: {
    preload: join(assets, "preload.cjs"), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, partition: "chronicle-management", spellcheck: false,
  } });
  manager.removeMenu();
  manager.webContents.on("will-navigate", (event, url) => { if (url !== SHELL_URL) event.preventDefault(); });
  manager.webContents.on("did-start-navigation", (_event, _url, _inPlace, mainFrame) => { if (mainFrame) { authority.navigate(); capability = randomUUID(); } });
  manager.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  manager.webContents.session.setPermissionCheckHandler(() => false);
  manager.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  manager.webContents.session.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  function sender(event: IpcMainInvokeEvent) {
    if (event.sender !== manager.webContents || !event.senderFrame || event.senderFrame !== manager.webContents.mainFrame || event.senderFrame.url !== SHELL_URL)
      fail("unauthorized", "Verwaltungsaktion ist nur im lokalen Hauptfenster verfügbar.");
  }
  ipcMain.handle("chronicle:hello", event => { sender(event); return capability; });
  const snapshot = async () => {
    const profiles = await store.list();
    // Management learns which worlds carry a Chronist key, never a single character of one.
    const chronistKeys = (await Promise.all(profiles.map(async profile => await store.hasChronistKey(profile.id) ? profile.id : ""))).filter(Boolean);
    // Warum der Chronist in der laufenden Welt fehlt. Ein Satz, nie ein Schlüsselzeichen.
    return { profiles, chronistKeys, chronistHinweis: host.chronistHinweis, recovery: await recovery.list(), state: host.state, profileId: host.owned?.profile.id, origin: host.ready?.origin,
      setupRequired: host.ready?.setupRequired, failure: host.failure, busy, version: app.getVersion(), runtime: host.ready ? { node: host.ready.nodeVersion, decoder: host.ready.decoder } : undefined };
  };
  async function retainSetupSession(id: string, origin: string, receipt: { value: string; expiresAt: number }) {
    // This binding is a private committed-operation receipt, independent of the
    // management document's navigation lease. It can only target its original
    // profile partition; it never authorizes opening a window from a stale view.
    const target = session.fromPartition(partitionFor(origin));
    await target.cookies.set({ url: origin, name: "chronicle_session", value: receipt.value, path: "/", httpOnly: true, secure: true, sameSite: "strict", expirationDate: receipt.expiresAt / 1000 });
    await target.cookies.flushStore();
    await store.clearSetupReceipt(id, receipt.value);
    if (host.owned?.profile.id === id && host.ready?.origin === origin) host.ready.setupRequired = false;
  }
  async function reconcileSetupSession(id: string, origin: string) {
    const receipt = await store.readSetupReceipt(id);
    if (receipt) await retainSetupSession(id, origin, receipt);
  }
  async function external(window: BrowserWindow, raw: string) {
    let url: URL;
    try { url = new URL(raw); } catch { return; }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || raw.length > 2048) return;
    const response = await dialog.showMessageBox(window, { type: "question", title: "Link im Systembrowser öffnen", message: url.origin, detail: url.href, buttons: ["Abbrechen", "Im Browser öffnen"], defaultId: 0, cancelId: 0 });
    if (response.response === 1 && !window.isDestroyed()) await shell.openExternal(url.href);
  }
  async function openGame(origin: string, local = false) {
    const partition = partitionFor(origin), ses = session.fromPartition(partition);
    const existing = [...games].find(window => !window.isDestroyed() && window.webContents.session === ses);
    if (existing) { existing.show(); existing.focus(); return; }
    const game = new BrowserWindow({ width: 1440, height: 940, title: "Atlas Chronicles", backgroundColor: "#121a1d", webPreferences: { partition, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    game.removeMenu(); games.add(game);
    if (local) {
      localGames.set(game, origin);
      // This remains installed after window destruction and blocks any queued
      // request once ownership is lost, while preserving the legitimate cookie.
      ses.webRequest.onBeforeRequest((details, callback) => callback({ cancel: new URL(details.url).origin === origin && (host.state !== "ready" || host.ready?.origin !== origin) }));
    }
    game.on("closed", () => { games.delete(game); localGames.delete(game); });
    ses.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      if (details.resourceType === "mainFrame" && new URL(details.url).origin === origin && !Object.keys(headers).some(name => name.toLowerCase() === "content-security-policy"))
        headers["Content-Security-Policy"] = ["default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'self'"];
      callback({ responseHeaders: headers });
    });
    game.webContents.on("will-navigate", (event, url) => { if (new URL(url).origin !== origin) { event.preventDefault(); void external(game, url); } });
    game.webContents.on("will-redirect", (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
    game.webContents.setWindowOpenHandler(details => { void external(game, details.url); return { action: "deny" }; });
    ses.setPermissionCheckHandler(() => false);
    ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
    await game.loadURL(origin);
  }
  async function cleanupRestore() { if (restore) { await rm(restore.path, { force: true }); restore = undefined; } }
  let wartendZuletzt = 0;
  manager.on("focus", () => manager.flashFrame(false));
  ipcMain.handle("chronicle:manage", async (event, envelope: unknown) => {
    let ownsOperation = false;
    try {
      sender(event);
      const value = object(envelope, ["capability", "request"]);
      if (value["capability"] !== capability) fail("unauthorized", "Verwaltungsansicht ist nicht mehr aktuell.");
      const request = command(value["request"]);
      if (request.kind === "status") return { ok: true, value: await snapshot() };
      // Lesen nimmt die Sperre nicht. Das Hostfenster fragt die Runden regelmaessig ab; mit Sperre
      // kollidierte genau das mit dem Klick, der das Fenster nach vorn holt (v0.4.1).
      if (request.kind === "runden") {
        if (host.state !== "ready") fail("host-unavailable", "Bitte zuerst die lokale Welt starten.");
        const runden = await host.request<readonly { wartend?: readonly unknown[] }[]>("runden", {});
        const wartend = runden.reduce((summe, runde) => summe + (runde.wartend?.length ?? 0), 0);
        // Wartet jemand Neues und das Fenster ist nicht vorn, blinkt es in der Taskleiste.
        if (wartend > wartendZuletzt && !manager.isFocused()) manager.flashFrame(true);
        wartendZuletzt = wartend;
        return { ok: true, value: runden };
      }
      if (busy) fail("operation-busy", "Eine lokale Aktion läuft bereits.");
      busy = true;
      ownsOperation = true;
      const assert = authority.lease();
      switch (request.kind) {
        case "create": {
          if (host.state !== "stopped") fail("host-busy", "Bitte zuerst den laufenden Host beenden.");
          const owned = await store.create(request.name); assert(); authority.select(owned.profile.id);
          const selected = authority.lease(), ready = await host.start(owned.profile.id);
          await reconcileSetupSession(owned.profile.id, ready.origin); selected(); break;
        }
        case "start": {
          await cleanupRestore(); assert(); authority.select(request.profileId);
          const selected = authority.lease(), ready = await host.start(request.profileId);
          await reconcileSetupSession(request.profileId, ready.origin); selected(); break;
        }
        case "stop": await cleanupRestore(); assert(); await host.stop(); authority.select(undefined); break;
        case "backup": {
          if (host.state !== "ready") fail("recovery-host", "Bitte die zu sichernde lokale Welt zuerst starten.");
          let saved: RecoveryManifest | undefined;
          await host.stop(async (owned, postgres) => { saved = await recovery.create(owned, postgres, app.getVersion()); });
          authority.select(undefined);
          return { ok: true, value: { recoveryId: saved!.id, counts: saved!.counts } };
        }
        case "recovery-restore": {
          if (host.state !== "stopped") fail("recovery-host", "Bitte den laufenden Host zuerst beenden.");
          const restored = await recovery.restore(request.recoveryId, request.name, store, assert); assert();
          authority.select(restored.owned.profile.id);
          const selected = authority.lease(), ready = await host.start(restored.owned.profile.id);
          const original = session.fromPartition(partitionFor(restored.manifest.sourceOrigin));
          const cookie = (await original.cookies.get({ name: "chronicle_session" })).find(value => value.httpOnly && value.secure && value.sameSite === "strict");
          selected();
          if (cookie) {
            const target = session.fromPartition(partitionFor(ready.origin));
            await target.cookies.set({ url: ready.origin, name: "chronicle_session", value: cookie.value, path: "/", httpOnly: true, secure: true, sameSite: "strict", ...(cookie.expirationDate ? { expirationDate: cookie.expirationDate } : {}) });
            await target.cookies.flushStore(); selected();
          }
          return { ok: true, value: await snapshot() };
        }
        case "open": if (!host.ready) fail("host-unavailable", "Lokaler Host ist nicht bereit."); await openGame(host.ready!.origin, true); break;
        case "setup": {
          if (!host.ready?.setupRequired) fail("already-setup", "Dieses Profil ist bereits eingerichtet.");
          const origin = host.ready!.origin, id = host.owned!.profile.id;
          const result = await host.request<{ value: string; expiresAt: number }>("setup", { name: request.name });
          await retainSetupSession(id, origin, result);
          assert(); await openGame(origin, true); break;
        }
        case "remote": await openGame(request.origin); break;
        case "restore-select": {
          if (host.state !== "stopped") fail("host-busy", "Bitte zuerst den laufenden Host beenden.");
          const result = await dialog.showOpenDialog(manager, { title: "Native Kampagne in eine neue Welt wiederherstellen", filters: [{ name: "Atlas Chronicles V4/V5", extensions: ["chronicle"] }], properties: ["openFile"] }); assert();
          if (result.canceled || !result.filePaths[0]) return { ok: true, value: { canceled: true } };
          const source = result.filePaths[0];
          if ((await stat(source)).size > 268_435_456) fail("file-size", "Kampagnendatei ist zu groß."); assert();
          const owned = await store.create(request.name); assert(); authority.select(owned.profile.id);
          const profileAssert = authority.lease();
          await host.start(owned.profile.id); profileAssert();
          const directory = join(owned.directory, "transfers"); await mkdir(directory, { recursive: true }); profileAssert();
          const ticket = randomUUID(), path = join(directory, `${ticket}.chronicle`);
          await copyFile(source, path); profileAssert();
          const inspected = await host.request<{ report: unknown; gms: unknown }>("inspect", { path }); profileAssert();
          restore = { ticket, path, profileId: owned.profile.id, ...inspected, assert: profileAssert };
          return { ok: true, value: { ticket, ...inspected } };
        }
        case "restore-confirm": {
          if (!restore || restore.ticket !== request.ticket || restore.profileId !== host.owned?.profile.id) fail("restore-ticket", "Wiederherstellungsprüfung ist nicht mehr aktuell.");
          restore!.assert();
          const report = await host.request("restore", { path: restore!.path }); restore!.assert();
          const gms = restore!.gms;
          await cleanupRestore();
          if (host.ready) host.ready.setupRequired = false;
          return { ok: true, value: { report, gms, enrollmentRequired: true } };
        }
        case "chronist-key": {
          // Only an own, existing profile of this installation may be addressed, and the
          // stored value never travels back: the reply is the ordinary status snapshot.
          const known = await store.list(); assert();
          if (!known.some(profile => profile.id === request.profileId)) fail("invalid-profile", "Diese lokale Welt ist auf diesem Rechner nicht vorhanden.");
          if (request.action === "set") await store.saveChronistKey(request.profileId, request.value);
          else await store.clearChronistKey(request.profileId);
          assert(); break;
        }
        case "enroll": {
          const pairing = await host.request("enroll", { campaignId: request.campaignId, userId: request.userId }); assert();
          return { ok: true, value: pairing };
        }
        /**
         * Eine lokale Welt löschen. Die eigentliche Prüfung — der getippte Name, ein lebender
         * Halter des Locks — steht in `ProfileStore.remove`; hier steht nur, was darüber hinaus
         * zu dieser Welt gehört: die Browserdaten ihrer Adresse. Ein neuer Host könnte denselben
         * zufälligen Port bekommen, und dann läge in seiner Partition noch das Sitzungsplätzchen
         * einer Welt, die es nicht mehr gibt. Es wäre wertlos (ein neuer cookieSecret), aber
         * „gelöscht" soll nichts zurücklassen.
         */
        case "loeschen": {
          // Nur die laufende Welt selbst ist tabu; eine ruhende darf gehen, waehrend eine andere laeuft.
          // `ProfileStore.remove` prueft zusaetzlich den Lock der Zielwelt.
          if (host.state !== "stopped" && host.owned?.profile.id === request.profileId) fail("host-busy", "Diese Welt läuft gerade. Beende sie zuerst oben mit „Welt beenden“.");
          const geloescht = await store.remove(request.profileId, request.name); assert();
          await session.fromPartition(partitionFor(originOf(geloescht))).clearStorageData();
          assert();
          return { ok: true, value: { name: geloescht.name } };
        }
        // Zugangsverwaltung: nur bei laufendem Host, weil sie die Datenbank der offenen Welt liest.
        case "einladung": case "kopplung": case "rolle": case "runde-anlegen": case "freigeben": case "ablehnen": {
          if (host.state !== "ready") fail("host-unavailable", "Bitte zuerst die lokale Welt starten.");
          // `command()` hat die Felder schon auf genau diese Form begrenzt; der Rest reist zum Worker.
          const { kind, ...felder } = request;
          const antwort = await host.request(kind, felder);
          assert();
          return { ok: true, value: antwort };
        }
      }
      return { ok: true, value: await snapshot() };
    } catch (error) { return { ok: false, error: error instanceof DesktopError ? error.message : "Die lokale Aktion ist fehlgeschlagen. Profilzustand prüfen." }; }
    finally { if (ownsOperation) busy = false; }
  });
  async function closeApplication() {
    if (quitting) return;
    if (busy) { manager.show(); return; }
    busy = true;
    try { await cleanupRestore(); await host.stop(); quitting = true; tray?.destroy(); app.quit(); }
    catch { manager.show(); await dialog.showMessageBox(manager, { type: "error", message: "Host-Abschluss ist nicht bestätigt. Anwendung bleibt geöffnet.", buttons: ["Verstanden"] }); }
    finally { busy = false; }
  }
  manager.on("close", event => {
    if (quitting) return;
    event.preventDefault();
    if (host.state === "stopped") { void closeApplication(); return; }
    void dialog.showMessageBox(manager, { type: "question", title: "Lokaler Host", message: "Was soll mit dem lokalen Host geschehen?", buttons: ["Abbrechen", "Host beenden und App schließen", "Host weiterlaufen lassen"], defaultId: 0, cancelId: 0 }).then(result => {
      if (result.response === 1) void closeApplication();
      if (result.response === 2) {
        if (!tray) {
          tray = new Tray(nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQImWP4z8Dwn4GBgYGJAQoAHgQCAa4BKTIAAAAASUVORK5CYII="));
          tray.setToolTip(`Atlas Chronicles – ${host.state}`);
          tray.setContextMenu(Menu.buildFromTemplate([{ label: "Welten öffnen", click: () => manager.show() }, { label: "Host beenden und schließen", click: () => void closeApplication() }]));
          tray.on("double-click", () => manager.show());
        }
        manager.hide();
      }
    });
  });
  app.on("before-quit", event => { if (!quitting) { event.preventDefault(); void closeApplication(); } });
  app.on("second-instance", () => { manager.show(); manager.focus(); });
  await manager.loadURL(SHELL_URL);
}
