// Die Tuschesprache — geteilte Grundlage aller Chronicle-Assetpakete.
//
// Extrahiert, als das **zweite** Paket kam (`pk.atlas` neben `pk.grundriss`), und keinen Tag
// früher: eine Abstraktion mit einem Nutzer ist Spekulation, eine mit zweien ist Duplikat-
// vermeidung. Der Grund, sie zu teilen, ist nicht die Zeilenzahl, sondern die **Handschrift**:
// Grundriss und Atlas sollen erkennbar mit derselben Feder gezeichnet sein, und das ist nur dann
// wahr, wenn beide buchstäblich dieselbe Palette und dieselben Striche benutzen.
//
// Beweis, dass die Extraktion nichts verändert hat: `npm run gate:assets` erzeugt `pk.grundriss`
// aus dieser Datei neu und vergleicht SHA-256 gegen die abgelegten Bytes. Grün heisst
// bytegleich — ein Refactor, der die Kunst anfasst, kann hier nicht unbemerkt durchgehen.

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

// ---------------------------------------------------------------------------------------------
// Palette — eine Tinte, damit eine erzeugte Karte als **eine** Zeichnung liest
// ---------------------------------------------------------------------------------------------

export const C = {
  tinte: "#2f2a22",
  tinteHell: "#7a6f5f",
  pergament: "#e9e0cb",
  pergamentTief: "#ded2b8",
  stein: "#d5cbb4",
  steinTief: "#c4b99f",
  holz: "#c39b6d",
  holzTief: "#a97f52",
  metall: "#9aa0a8",
  metallTief: "#7b828b",
  wasser: "#93b0bd",
  wasserTief: "#6f95a6",
  flamme: "#dd8a33",
  tuch: "#b26b5e",
  erde: "#cdbb9c",
  fels: "#b9b2a4",
  felsTief: "#9d968a",
  knochen: "#e3ddcc",
  pilz: "#a98fb0",
  // Ab 1.2.0 / pk.atlas: die Übersichtskarte braucht Grün, das der Grundriss nie brauchte.
  gruen: "#8ea87c",
  gruenTief: "#6d8a5e",
};

// ---------------------------------------------------------------------------------------------
// Deterministisches Rauschen. Pro Asset-Name gesät, nie pro Lauf.
// ---------------------------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Der Paket-Präfix geht in die Saat ein, damit gleichnamige Assets in zwei Paketen nicht
 * dieselbe Zeichnung bekommen. `zufallFabrik("pk.grundriss")` reproduziert 1.0.0/1.1.0 exakt.
 */
export function zufallFabrik(paketId) {
  return function zufall(name) {
    const digest = createHash("sha256").update(`${paketId}/${name}`, "utf8").digest();
    const rnd = mulberry32(digest.readUInt32BE(0));
    return {
      // Bewusst quantisiert: `toFixed` in den Zeichenhelfern würde auch runden, aber hier gerundet
      // ist die *Geometrie* ganzzahlige Zehntel, also kann kein Float-Drucker abweichen.
      zahl: (min, max) => Math.round((min + rnd() * (max - min)) * 10) / 10,
      ganz: (min, max) => min + Math.floor(rnd() * (max - min + 1)),
      waehle: (list) => list[Math.floor(rnd() * list.length)],
    };
  };
}

// ---------------------------------------------------------------------------------------------
// SVG-Helfer. Kein Skript, keine externe Referenz, kein Raster — das Assetgate erzwingt alle drei.
// ---------------------------------------------------------------------------------------------

export const n = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};
export const attrs = (row) => Object.entries(row).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ` ${k}="${typeof v === "number" ? n(v) : v}"`).join("");
export const rect = (x, y, w, h, o = {}) => `<rect${attrs({ x, y, width: w, height: h, ...o })}/>`;
export const circle = (cx, cy, r, o = {}) => `<circle${attrs({ cx, cy, r, ...o })}/>`;
export const ellipse = (cx, cy, rx, ry, o = {}) => `<ellipse${attrs({ cx, cy, rx, ry, ...o })}/>`;
export const line = (x1, y1, x2, y2, o = {}) => `<line${attrs({ x1, y1, x2, y2, ...o })}/>`;
export const path = (d, o = {}) => `<path${attrs({ d, ...o })}/>`;
export const poly = (points, o = {}) => `<polygon${attrs({ points: points.map(([x, y]) => `${n(x)},${n(y)}`).join(" "), ...o })}/>`;
export const polyline = (points, o = {}) => `<polyline${attrs({ points: points.map(([x, y]) => `${n(x)},${n(y)}`).join(" "), fill: "none", ...o })}/>`;
export const group = (o, ...kinder) => `<g${attrs(o)}>${kinder.join("")}</g>`;

export const kontur = (extra = {}) => ({ fill: "none", stroke: C.tinte, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", ...extra });
export const feder = (extra = {}) => ({ fill: "none", stroke: C.tinteHell, "stroke-width": 1.2, "stroke-linecap": "round", ...extra });

export function svg(titel, breite, hoehe, inhalt) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(breite)} ${n(hoehe)}" width="${n(breite)}" height="${n(hoehe)}">`,
    `<title>${titel}</title>`,
    inhalt,
    `</svg>`,
    "",
  ].join("\n");
}

/** Ein rauer, geschlossener Klumpen. Trägt Felsblöcke, Lachen, Knochenhaufen und Waldstücke. */
export function klumpen(r, cx, cy, radius, ecken, rauheit) {
  return Array.from({ length: ecken }, (_, k) => {
    const a = (k / ecken) * Math.PI * 2;
    const rr = radius * r.zahl(1 - rauheit, 1 + rauheit);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
}

// ---------------------------------------------------------------------------------------------
// Paketbau — Manifest, Schreiben und `--pruefe`, für jedes erzeugte Paket dasselbe
// ---------------------------------------------------------------------------------------------

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const bytes = (text) => Buffer.byteLength(text, "utf8");

async function vorhandeneDateien(dir) {
  const gefunden = [];
  const walk = async (aktuell) => {
    let eintraege;
    try { eintraege = await readdir(aktuell, { withFileTypes: true }); } catch { return; }
    for (const eintrag of eintraege) {
      const p = join(aktuell, eintrag.name);
      if (eintrag.isDirectory()) await walk(p);
      else gefunden.push(relative(dir, p).split(sep).join("/"));
    }
  };
  await walk(dir);
  return gefunden.sort();
}

/**
 * Baut die Dateien eines Pakets im Speicher: jedes Asset, der Lizenztext und das
 * schlüsselsortierte Manifest. Schreibt nichts — Trennung, damit `--pruefe` denselben Bau prüft,
 * den ein echter Lauf ablegen würde.
 */
export function bauePaket({ paketId, version, titel, urheber, zelle, lizenzDatei, lizenzText, lizenz, katalog }) {
  const dateien = new Map();
  dateien.set(lizenzDatei, lizenzText);
  const assets = [];
  for (const eintrag of katalog) {
    const inhalt = eintrag.zeichne();
    const datei = `${eintrag.art}/${eintrag.name}.svg`;
    if (dateien.has(datei)) throw new Error(`doppelte Datei ${datei}`);
    dateien.set(datei, inhalt);
    const breite = eintrag.einheiten[0] * zelle, hoehe = eintrag.einheiten[1] * zelle;
    assets.push({
      name: eintrag.name,
      art: eintrag.art,
      datei,
      mimeType: "image/svg+xml",
      sha256: sha256(inhalt),
      bytes: bytes(inhalt),
      groesse: [breite, hoehe],
      // Ankermitte für alles in diesen Paketen, erklärt statt angenommen: das Feld existiert
      // genau dafür, dass ein späteres Paket ein Türblatt an seiner Angel verankern darf.
      anker: [Math.round(breite / 2), Math.round(hoehe / 2)],
      einheiten: eintrag.einheiten,
      kachelbar: eintrag.kachelbar === true,
      schlagworte: eintrag.schlagworte,
      lizenz: null,
    });
  }
  const paket = {
    schemaVersion: 1,
    kind: "asset-pack",
    id: paketId,
    titel,
    version,
    urheber,
    zellgroesse: zelle,
    lizenz: { ...lizenz, datei: lizenzDatei, textSha256: sha256(lizenzText) },
    assets,
  };
  const sortiere = (value) =>
    Array.isArray(value) ? value.map(sortiere)
      : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sortiere(v)]))
        : value;
  dateien.set("paket.json", `${JSON.stringify(sortiere(paket), null, 2)}\n`);
  return dateien;
}

/**
 * Schreibt ein Paket auf die Platte — oder prüft mit `--pruefe` nur, ob die Platte schon exakt
 * das enthält, was dieser Bau erzeugt. Verwaiste Dateien werden gemeldet und entfernt: eine Datei
 * ohne Manifestzeile ist ein Asset ohne Lizenz.
 */
export async function erzeugePaket(konfiguration, paketDir, argv = process.argv) {
  const pruefe = argv.includes("--pruefe");
  const dateien = bauePaket(konfiguration);
  const vorhanden = await vorhandeneDateien(paketDir);
  const abweichungen = [];

  for (const [pfad, inhalt] of dateien) {
    const ziel = join(paketDir, pfad);
    let alt = null;
    try { alt = await readFile(ziel, "utf8"); } catch { /* neu */ }
    if (alt === inhalt) continue;
    abweichungen.push(alt === null ? `fehlt: ${pfad}` : `abweichend: ${pfad}`);
    if (!pruefe) { await mkdir(dirname(ziel), { recursive: true }); await writeFile(ziel, inhalt, "utf8"); }
  }
  for (const pfad of vorhanden) {
    if (dateien.has(pfad)) continue;
    abweichungen.push(`verwaist: ${pfad}`);
    if (!pruefe) await rm(join(paketDir, pfad), { force: true });
  }

  if (pruefe) {
    if (abweichungen.length) {
      console.error(`${konfiguration.paketId} --pruefe ROT — ${abweichungen.length} Abweichung(en):`);
      for (const zeile of abweichungen) console.error(`  ${zeile}`);
      process.exit(1);
    }
    console.log(`${konfiguration.paketId} --pruefe GRÜN — ${dateien.size} Dateien identisch reproduziert`);
    return;
  }
  console.log(`${konfiguration.paketId} — ${konfiguration.katalog.length} Assets, ${dateien.size} Dateien in ${paketDir}`);
  for (const zeile of abweichungen) console.log(`  ${zeile}`);
  if (!abweichungen.length) console.log("  (unverändert)");
}

/** Der CC0-Text, den beide Pakete tatsächlich mitliefern. Sein sha256 steht im Manifest. */
export function cc0Text(paketId, urheber, skript) {
  return `Chronicle — Assetpaket "${paketId}"

Copyright (c) 2026 ${urheber}

Zu diesem Werk gehoerende Grafiken wurden vollstaendig in diesem Repository erzeugt
(${skript}). Es wurde kein fremdes Bild-, Textur-, Schrift-
oder Vorlagenmaterial verwendet, eingebettet, abgepaust oder abgeleitet.

Der Urheber gibt dieses Werk unter CC0 1.0 Universal (Public Domain Dedication) frei:
https://creativecommons.org/publicdomain/zero/1.0/

Soweit nach Gesetz moeglich, verzichtet der Urheber weltweit auf alle Urheber- und
verwandten Schutzrechte an diesem Werk. Das Werk darf ohne Genehmigung und ohne
Namensnennung kopiert, veraendert, verbreitet und auch kommerziell genutzt werden.

Diese Datei ist die Lizenzquelle des Pakets. Ihr SHA-256 steht als "textSha256" im
Manifest paket.json; die Pruefung erfolgt in tools/gate-assets.mjs.
`;
}
