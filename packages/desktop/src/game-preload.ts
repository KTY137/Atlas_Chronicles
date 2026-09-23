// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { contextBridge, ipcRenderer } from "electron";

// Electron unter Windows: Nach Chromiums eigenem confirm()/alert() behält die Seite keinen
// Tastaturfokus mehr. Klicks kommen an, Eingabefelder aber nehmen nichts mehr an, bis das
// Fenster einmal den Fokus verliert. Jeder Abbruch mit „Ungespeicherte Änderungen verwerfen?“
// ließ so die Charaktererstellung halb tot zurück (Kaya, 2026-09-15 und 2026-09-23). Im Browser
// tritt das nicht auf, darum blieb es in Playwright unsichtbar. Der Dialog kommt deshalb aus
// dem Hauptprozess, der danach den Fokus ausdrücklich zurückgibt. Mehr als diese zwei
// Dialoge bekommt die Spielseite hier nicht: sie kann von einem fremden Host stammen.
const text = (value: unknown) => String(value ?? "").slice(0, 4000);
contextBridge.exposeInMainWorld("chronicleGameDialog", Object.freeze({
  confirm: (message: unknown) => ipcRenderer.sendSync("chronicle:game-dialog", { kind: "confirm", message: text(message) }) === true,
  alert: (message: unknown) => { ipcRenderer.sendSync("chronicle:game-dialog", { kind: "alert", message: text(message) }); },
}));
contextBridge.executeInMainWorld({ func: () => {
  // Diese Funktion läuft serialisiert in der Seitenwelt; der Desktop-Build kennt kein DOM.
  const page = globalThis as unknown as { chronicleGameDialog: { confirm(message: unknown): boolean; alert(message: unknown): void }; confirm(message?: unknown): boolean; alert(message?: unknown): void };
  const dialog = page.chronicleGameDialog;
  page.confirm = (message?: unknown) => dialog.confirm(message);
  page.alert = (message?: unknown) => dialog.alert(message);
} });
