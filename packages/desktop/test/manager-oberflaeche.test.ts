// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Das Hostfenster muss überhaupt erst laufen.
 *
 * Am 17.09.2026 stand in `manager.js` ein Anzeigetext mit einem geraden Anführungszeichen
 * mitten in einer Zeichenkette (`"… „Zugangslink" …"`). Damit war die Datei für den Browser
 * nicht mehr lesbar: `render()` lief nie, und im Fenster fehlte fast alles — nur das nackte
 * HTML stand noch da. Keine einzige Prüfung hat diese Datei bis dahin auch nur geöffnet.
 *
 * Zwei Fehler fängt das hier ab, und beide sehen im Fenster gleich aus (leere Felder):
 *
 *  - **Die Datei lässt sich nicht lesen.** Ein Syntaxfehler irgendwo kostet die ganze Oberfläche.
 *  - **Ein Feld fehlt.** `byId("…")` gibt dann `null`, der nächste Zugriff wirft, und alles ab
 *    dieser Stelle wird nicht mehr gezeichnet.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const datei = (name: string) => fileURLToPath(new URL(`../manager/${name}`, import.meta.url));
const lies = (name: string) => readFile(datei(name), "utf8");

it("lässt sich als Skript lesen — ein Syntaxfehler kostet das ganze Fenster", async () => {
  const quelle = await lies("manager.js");
  // Derselbe Parser, den auch der Browser benutzt. `new Function` führt nichts aus, es übersetzt nur.
  expect(() => new Function(quelle), "manager.js ist nicht lesbar").not.toThrow();
});

it("spricht nur Felder an, die es im Fenster wirklich gibt", async () => {
  const [quelle, html] = await Promise.all([lies("manager.js"), lies("index.html")]);
  const vorhanden = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(treffer => treffer[1]!));
  const angesprochen = [...quelle.matchAll(/\bbyId\("([^"]+)"\)/g)].map(treffer => treffer[1]!);
  expect(angesprochen.length).toBeGreaterThan(20);
  expect([...new Set(angesprochen)].filter(id => !vorhanden.has(id))).toEqual([]);
});

it("hält deutsche Anführungszeichen paarweise — der Fehler vom 17.09.2026", async () => {
  // Ein „ ohne sein “ ist in einem Kommentar harmlos und in einer Zeichenkette fatal. Geprüft
  // wird deshalb genau dort, wo es wehtut: in den Anzeigetexten selbst.
  for (const name of ["manager.js", "index.html"]) {
    const inhalt = await lies(name);
    const offen = (inhalt.match(/„/g) ?? []).length, zu = (inhalt.match(/“/g) ?? []).length;
    expect(offen, `${name}: ${offen} mal „ gegen ${zu} mal “`).toBe(zu);
  }
});

it("hinterlegt jede Klasse, die das Fenster vergibt, auch im Stylesheet", async () => {
  const [quelle, css] = await Promise.all([lies("manager.js"), lies("manager.css")]);
  // Nur die Klassen aus `el(...)`; zusammengesetzte wie "profile ausgesperrt" einzeln geprüft.
  const klassen = new Set([...quelle.matchAll(/class:\s*"([^"]+)"/g)].flatMap(treffer => treffer[1]!.split(/\s+/)));
  expect([...klassen].filter(klasse => !css.includes(`.${klasse}`))).toEqual([]);
});
