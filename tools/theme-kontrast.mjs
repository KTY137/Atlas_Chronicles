#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Der Kontrastbericht über ALLE mitgelieferten Looks.
//
// Warum als eigenes Werkzeug und nicht nur als Test: `packages/theme/test/theme.test.ts`
// sagt bestanden oder nicht bestanden. Beim Entwerfen einer Palette braucht man aber die
// Zahl — welches Paar fehlt, und um wie viel. Dieses Werkzeug liest denselben Prüfer wie
// der Test (`evaluateThemeAccessibility`), damit hier nie eine zweite, mildere Wahrheit
// entsteht: der frühere Wegwerf-Prüfer `tools/aurora-contrast.mjs` war eine Nachbildung
// und hätte still auseinanderlaufen können.
//
// Aufruf:
//   node --import tsx tools/theme-kontrast.mjs            Kurzbericht, ein Look je Zeile
//   node --import tsx tools/theme-kontrast.mjs --voll     jedes Paar mit Verhältnis
//   node --import tsx tools/theme-kontrast.mjs --json     maschinenlesbar
//   node --import tsx tools/theme-kontrast.mjs Midnight   nur dieser Look, alle Paare
//
// Beendet sich mit 1, sobald ein Look ein erklärtes Paar verfehlt.

import { evaluateThemeAccessibility, getThemePreset, THEME_PRESET_IDS, THEME_CONTRAST_PAIRS, THEME_CONTRAST_ALGORITHM } from "../packages/theme/src/index.ts";

const argumente = process.argv.slice(2);
const voll = argumente.includes("--voll");
const alsJson = argumente.includes("--json");
const gewaehlt = argumente.filter(wert => !wert.startsWith("--"));
const looks = gewaehlt.length > 0 ? gewaehlt : [...THEME_PRESET_IDS];

const unbekannt = looks.filter(id => !THEME_PRESET_IDS.includes(id));
if (unbekannt.length > 0) {
  console.error(`Unbekannter Look: ${unbekannt.join(", ")}. Bekannt sind: ${THEME_PRESET_IDS.join(", ")}`);
  process.exit(2);
}

/** Ein heller Look hat eine helle Grundfläche; das steht nirgends als Feld und wird gemessen. */
function istHell(colors) {
  const kanal = (hex, offset) => {
    const wert = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return wert <= 0.04045 ? wert / 12.92 : ((wert + 0.055) / 1.055) ** 2.4;
  };
  const helligkeit = 0.2126 * kanal(colors.bg, 1) + 0.7152 * kanal(colors.bg, 3) + 0.0722 * kanal(colors.bg, 5);
  return helligkeit > 0.18;
}

const berichte = looks.map(id => {
  const theme = getThemePreset(id);
  const bericht = evaluateThemeAccessibility(theme);
  const knappste = [...bericht.pairs].sort((a, b) => a.ratio / a.minimum - b.ratio / b.minimum)[0];
  return { id, theme, bericht, knappste, hell: istHell(theme.colors) };
});

if (alsJson) {
  console.log(JSON.stringify({
    algorithmus: THEME_CONTRAST_ALGORITHM,
    paare: THEME_CONTRAST_PAIRS.length,
    looks: berichte.map(({ id, theme, bericht, knappste, hell }) => ({
      id, hell, besteht: bericht.passes, fehlschlaege: bericht.failures,
      knappstesPaar: { id: knappste.id, verhaeltnis: knappste.ratio, mindestens: knappste.minimum },
      geometrie: theme.geometry, schrift: theme.typography, bewegung: theme.motion,
      farben: theme.colors,
    })),
  }, null, 2));
} else {
  console.log(`Prüfer: ${THEME_CONTRAST_ALGORITHM} · ${THEME_CONTRAST_PAIRS.length} erklärte Paare je Look\n`);
  for (const { id, bericht, knappste, hell } of berichte) {
    const bestanden = bericht.pairs.length - bericht.failures.length;
    const zeichen = bericht.passes ? "bestanden" : "GEFALLEN  ";
    console.log(`${id.padEnd(11)} ${hell ? "hell " : "dunkel"}  ${zeichen}  ${bestanden}/${bericht.pairs.length}  knappstes Paar ${knappste.id} = ${knappste.ratio.toFixed(2)} (nötig ${knappste.minimum})`);
    for (const fehler of bericht.failures) {
      const paar = bericht.pairs.find(eintrag => eintrag.id === fehler);
      console.log(`    FEHLT  ${paar.id}  ${paar.ratio.toFixed(2)} < ${paar.minimum}`);
    }
    if (voll) {
      for (const paar of [...bericht.pairs].sort((a, b) => a.ratio - b.ratio)) {
        console.log(`    ${paar.passes ? " " : "!"} ${paar.id.padEnd(28)} ${paar.ratio.toFixed(2).padStart(6)}  ≥ ${paar.minimum}  ${paar.kind}`);
      }
    }
  }
  const gefallen = berichte.filter(eintrag => !eintrag.bericht.passes);
  console.log(`\n${berichte.length - gefallen.length}/${berichte.length} Looks bestehen alle ${THEME_CONTRAST_PAIRS.length} Paare.`);
}

process.exitCode = berichte.some(eintrag => !eintrag.bericht.passes) ? 1 : 0;
