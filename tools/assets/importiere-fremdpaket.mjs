#!/usr/bin/env node
// Baut aus einem Verzeichnis fremder Bilddateien ein vertragskonformes Assetpaket.
//
// **Warum es das gibt.** `assetpaket.ts` sieht `herkunft: "extern"` seit dem ersten Tag vor und
// verlangt dafür eine benannte Quelle und einen gehashten Lizenztext — aber es gab keinen Weg,
// so ein Paket zu *bauen*. `tusche.mjs` erzeugt nur, was in diesem Repository gezeichnet wird.
// Damit war jede freie Assetsammlung im Netz praktisch unbenutzbar, egal wie klar ihre Lizenz
// war. Dieses Skript ist der fehlende Weg.
//
// **Was es erzwingt, und warum.** Der Vertrag ist an RB-21c und RB-21d §6.1 gewachsen, und beide
// Lehren stecken hier als Abbruchbedingung:
//
//  - **Ohne mitgelieferten Lizenztext kein Paket.** Ein SPDX-Bezeichner ist eine Behauptung; der
//    gehashte Text ist der Beleg. GitHub meldet für Azgaars Lizenz `spdx_id: NOASSERTION`, weil
//    dort MIT einen eingefügten Zusatz trägt — ein Bezeichner allein ist in beide Richtungen
//    falsch. `--lizenz` ist deshalb Pflicht und wird als Datei ins Paket kopiert.
//  - **Ohne Quell-URL kein Paket.** `herkunft: "extern"` verlangt sie im Format; hier wird sie
//    zusätzlich auf HTTP(S) ohne eingebettete Zugangsdaten geprüft.
//  - **Keine Datei ohne Manifestzeile.** Jede kopierte Datei wird gehasht und eingetragen; das
//    Gate verwirft sonst das ganze Paket als verwaist — das ist genau die RB-21c-Lage (179
//    CC-BY-NC-SA-Posten in einem `public/`, das niemand aufgezählt hatte), nur klein.
//  - **Abmessungen werden gemessen, nicht geglaubt.** PNG-Kopf und SVG-`viewBox` werden gelesen.
//    Ein Paket, das seine eigene Grösse falsch angibt, zeichnet der Renderer falsch skaliert.
//
// **Was es ausdrücklich nicht tut:** es lädt nichts herunter und es prüft keine Rechte. Es
// verwandelt eine Sammlung, deren Lizenz **du** geprüft hast, in ein Paket, das der Vertrag
// annimmt. Die Rechteprüfung bleibt eine menschliche Entscheidung.
//
// Beispiel — eine CC0-Sammlung (Kenney, OpenGameArt) einbinden:
//
//   node tools/assets/importiere-fremdpaket.mjs \
//     --quelle .local/kenney-scribble-dungeon \
//     --id pk.kenney.kritzel --titel "Scribble Dungeon" --urheber "Kenney" \
//     --spdx CC0-1.0 --herkunft-url https://kenney.nl/assets/scribble-dungeons \
//     --lizenz .local/kenney-scribble-dungeon/License.txt --art aufbau
//
// Die `art` je Datei kommt aus dem Unterverzeichnis, wenn das so heisst wie eine Art
// (`boden/`, `moebel/`, ...), sonst aus `--art`.

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Muss mit `ASSET_ARTEN` in `packages/szene/src/assetpaket.ts` übereinstimmen. */
const ARTEN = ["boden", "wand", "tuer", "aufbau", "moebel", "gefaess", "licht", "marke", "figur"];
const MIME = { ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };

function argumente(argv) {
  const werte = new Map();
  for (let i = 2; i < argv.length; i++) {
    const teil = argv[i];
    if (!teil.startsWith("--")) continue;
    const gleich = teil.indexOf("=");
    if (gleich > 0) werte.set(teil.slice(2, gleich), teil.slice(gleich + 1));
    else werte.set(teil.slice(2), argv[++i] ?? "");
  }
  return werte;
}

const abbruch = (text) => { console.error(`importiere-fremdpaket: ${text}`); process.exit(2); };

/** Ein Dateiname wird zu einem Bezeichner: `[a-z0-9][a-z0-9_.-]*`, sonst nimmt ihn der Parser nicht. */
function bezeichner(name) {
  const roh = name.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").replace(/^[^a-z0-9]+/, "");
  return roh || null;
}

/** PNG: Breite und Höhe stehen im IHDR, direkt hinter Signatur und Längenfeld. */
function pngMasse(bytes) {
  const signatur = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signatur)) return null;
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

/** SVG: `viewBox` zuerst, weil sie die maßgebliche Zeichenfläche ist; `width`/`height` als Rückfall. */
function svgMasse(text) {
  const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(text);
  if (box) return [Math.round(Number(box[1])), Math.round(Number(box[2]))];
  const w = /\swidth\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(text);
  const h = /\sheight\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(text);
  return w && h ? [Math.round(Number(w[1])), Math.round(Number(h[1]))] : null;
}

async function dateienUnter(dir) {
  const gefunden = [];
  const walk = async (aktuell) => {
    for (const eintrag of await readdir(aktuell, { withFileTypes: true })) {
      const p = join(aktuell, eintrag.name);
      if (eintrag.isDirectory()) await walk(p);
      else gefunden.push(p);
    }
  };
  await walk(dir);
  return gefunden.sort();
}

async function main() {
  const arg = argumente(process.argv);
  const quelle = arg.get("quelle"), id = arg.get("id"), titel = arg.get("titel");
  const urheber = arg.get("urheber"), spdx = arg.get("spdx"), herkunftUrl = arg.get("herkunft-url");
  const lizenzPfad = arg.get("lizenz"), standardArt = arg.get("art") ?? "aufbau";
  const zelle = Number(arg.get("zellgroesse") ?? 64);
  const version = arg.get("version") ?? "1.0.0";

  if (!quelle) abbruch("--quelle <verzeichnis> fehlt");
  if (!id || !/^[a-z0-9][a-z0-9_.-]*$/.test(id)) abbruch("--id muss ein kleingeschriebener Bezeichner sein, z. B. pk.kenney.kritzel");
  if (!titel) abbruch("--titel fehlt");
  if (!urheber) abbruch("--urheber fehlt — bei fremder Herkunft ist der Rechteinhaber Pflicht");
  if (!spdx || !/^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(spdx)) abbruch("--spdx fehlt oder ist kein Bezeichner (CC0-1.0, MIT, LicenseRef-...)");
  if (!lizenzPfad) abbruch("--lizenz <datei> fehlt. Ein Bezeichner ist eine Behauptung, der gehashte Text ist der Beleg (RB-21d §6.1)");
  if (!herkunftUrl) abbruch("--herkunft-url fehlt. `herkunft: \"extern\"` ohne benannte Quelle nimmt der Parser nicht an");
  try {
    const url = new URL(herkunftUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Protokoll");
  } catch { abbruch("--herkunft-url muss eine HTTP(S)-Adresse ohne Zugangsdaten sein"); }
  if (!ARTEN.includes(standardArt)) abbruch(`--art muss eine von ${ARTEN.join(", ")} sein`);
  if (!Number.isSafeInteger(zelle) || zelle < 1 || zelle > 4096) abbruch("--zellgroesse muss eine Ganzzahl in 1..4096 sein");
  if (!/^\d+\.\d+\.\d+$/.test(version)) abbruch("--version muss dreiteilig sein, z. B. 1.0.0");

  let lizenzText;
  try { lizenzText = await readFile(lizenzPfad, "utf8"); }
  catch { abbruch(`Lizenzdatei ${lizenzPfad} ist nicht lesbar`); }
  if (!lizenzText.trim()) abbruch("die Lizenzdatei ist leer");

  const quellDateien = await dateienUnter(quelle);
  // `--ziel` schreibt ausserhalb von assets/packs — der Test fuehrt den Importeur damit in ein
  // Temp-Verzeichnis, statt das Repo zu verschmutzen. Ohne den Schalter bleibt das Ziel der Ort,
  // an dem das Gate Pakete sucht.
  const zielDir = arg.get("ziel") ? join(arg.get("ziel"), id) : join(ROOT, "assets", "packs", id);
  const dateien = new Map([["lizenz.txt", Buffer.from(lizenzText, "utf8")]]);
  const assets = [];
  const namen = new Set();
  const uebersprungen = [];

  for (const pfad of quellDateien) {
    const ext = extname(pfad).toLowerCase();
    const mimeType = MIME[ext];
    if (!mimeType) { uebersprungen.push(`${relative(quelle, pfad)}: kein Bildformat des Vertrags`); continue; }
    if (mimeType === "image/webp") { uebersprungen.push(`${relative(quelle, pfad)}: WebP-Abmessungen werden hier nicht gemessen; als PNG oder SVG einliefern`); continue; }
    const bytes = await readFile(pfad);
    const masse = mimeType === "image/png" ? pngMasse(bytes) : svgMasse(bytes.toString("utf8"));
    if (!masse || !(masse[0] > 0) || !(masse[1] > 0)) { uebersprungen.push(`${relative(quelle, pfad)}: Abmessungen nicht lesbar`); continue; }

    const teile = relative(quelle, pfad).split(sep);
    const ordner = teile.length > 1 ? teile[teile.length - 2].toLowerCase() : "";
    const art = ARTEN.includes(ordner) ? ordner : standardArt;
    const name = bezeichner(basename(pfad, ext));
    if (!name) { uebersprungen.push(`${relative(quelle, pfad)}: Dateiname ergibt keinen Bezeichner`); continue; }
    if (namen.has(name)) { uebersprungen.push(`${relative(quelle, pfad)}: Name ${name} ist schon vergeben`); continue; }
    namen.add(name);

    const datei = `${art}/${name}${ext}`;
    dateien.set(datei, bytes);
    assets.push({
      name, art, datei, mimeType,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      groesse: masse,
      anker: [Math.round(masse[0] / 2), Math.round(masse[1] / 2)],
      // Footprint aufgerundet: ein Stück, das eine Zelle überragt, belegt zwei.
      einheiten: [Math.max(1, Math.ceil(masse[0] / zelle)), Math.max(1, Math.ceil(masse[1] / zelle))],
      kachelbar: false,
      schlagworte: ["extern", art],
      lizenz: null,
    });
  }

  if (!assets.length) abbruch(`in ${quelle} lag keine verwertbare Bilddatei${uebersprungen.length ? ` (${uebersprungen.length} übersprungen)` : ""}`);

  const sortiere = (wert) =>
    Array.isArray(wert) ? wert.map(sortiere)
      : wert && typeof wert === "object" ? Object.fromEntries(Object.entries(wert).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sortiere(v)]))
        : wert;
  const paket = {
    schemaVersion: 1, kind: "asset-pack", id, titel, version, urheber, zellgroesse: zelle,
    lizenz: {
      spdx, inhaber: urheber, herkunft: "extern", quelle: herkunftUrl,
      datei: "lizenz.txt", textSha256: createHash("sha256").update(lizenzText, "utf8").digest("hex"),
    },
    assets: assets.sort((a, b) => (a.datei < b.datei ? -1 : a.datei > b.datei ? 1 : 0)),
  };
  dateien.set("paket.json", Buffer.from(`${JSON.stringify(sortiere(paket), null, 2)}\n`, "utf8"));

  // Das Zielverzeichnis wird vollständig ersetzt: eine übrig gebliebene Datei aus einem früheren
  // Lauf hätte keine Manifestzeile und damit keine Lizenz — genau der Fall, den das Gate rot macht.
  await rm(zielDir, { recursive: true, force: true });
  for (const [pfad, inhalt] of dateien) {
    const ziel = join(zielDir, pfad);
    await mkdir(join(ziel, ".."), { recursive: true });
    await writeFile(ziel, inhalt);
  }

  console.log(`importiert: ${assets.length} Assets nach assets/packs/${id}`);
  console.log(`  Lizenz ${spdx}, Herkunft extern, Quelle ${herkunftUrl}`);
  for (const zeile of uebersprungen) console.log(`  übersprungen — ${zeile}`);
  console.log(`\nJetzt prüfen: npm run gate:assets`);
}

await main();
