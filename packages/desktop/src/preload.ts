// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { contextBridge, ipcRenderer } from "electron";

// Capability stays in the isolated preload closure, outside page JavaScript.
const capability = ipcRenderer.invoke("chronicle:hello") as Promise<string>;
contextBridge.exposeInMainWorld("chronicleDesktop", Object.freeze({
  invoke: async (request: unknown) => ipcRenderer.invoke("chronicle:manage", { capability: await capability, request }),
}));
