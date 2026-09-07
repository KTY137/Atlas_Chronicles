// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Ohne Produktversion ist nichts taggbar, und ohne Tag gibt es kein Registry-Release und
// keinen Update-Feed (design/10-hosted-betrieb-und-auslieferung.md §1.9, §4.1).
//
// Geprüft werden nur die Manifeste, die tatsächlich ein Artefakt ausliefern: die Wurzel (das
// Server-Image) und der Desktop. Bibliothekspakete bleiben absichtlich auf 0.0.0 — sie werden
// nie einzeln veröffentlicht, und eine Pflichtversion dort wäre Zeremonie ohne Nutzen.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/** Manifeste, die ein auslieferbares Artefakt tragen. Alle anderen werden ignoriert. */
export const AUSGELIEFERT = ["chronicle", "@chronicle/desktop"];

/**
 * @param {{name: string, version: string}[]} manifeste
 * @returns {string[]} Verstöße im Klartext; leer heißt in Ordnung.
 */
export function pruefeVersionen(manifeste) {
  const relevant = manifeste.filter((m) => AUSGELIEFERT.includes(m.name));
  const verstoesse = [];
  for (const m of relevant) {
    if (m.version === "0.0.0") verstoesse.push(`${m.name} trägt die Platzhalterversion 0.0.0 — es gibt keine Produktversion.`);
  }
  // Zwei Artefakte aus einem Baum sind eine Auslieferung. Laufen ihre Versionen auseinander,
  // benennt ein Fehlerbericht nicht mehr eindeutig einen Stand.
  const gesetzt = relevant.filter((m) => m.version !== "0.0.0");
  const wurzel = gesetzt.find((m) => m.name === "chronicle");
  if (wurzel) {
    for (const m of gesetzt) {
      if (m.version !== wurzel.version) verstoesse.push(`${m.name} steht auf ${m.version}, die Wurzel auf ${wurzel.version} — eine Auslieferung, zwei Versionen.`);
    }
  }
  return verstoesse;
}

const PFADE = ["../package.json", "../packages/desktop/package.json"];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifeste = [];
  for (const pfad of PFADE) {
    const roh = JSON.parse(await readFile(new URL(pfad, import.meta.url), "utf8"));
    manifeste.push({ name: roh.name, version: roh.version });
  }
  const verstoesse = pruefeVersionen(manifeste);
  if (verstoesse.length) {
    for (const v of verstoesse) console.error(`gate:version — ${v}`);
    process.exit(1);
  }
  console.log(`gate:version GREEN — ${manifeste.map((m) => `${m.name}@${m.version}`).join(", ")}`);
}
