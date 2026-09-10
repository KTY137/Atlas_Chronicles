// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Ein Reparaturvorschlag für eine einzelne Farbe.
 *
 * Ein Prüfbericht, der nur sagt „diese Paarung ist zu blass", schiebt die Arbeit zurück an
 * jemanden, der die Rechnung dahinter nicht kennt. Die Werkstatt soll stattdessen einen
 * fertigen Wert anbieten können. Dieses Modul liefert ihn.
 *
 * **Die Regel: nur die Helligkeit wandert.** Farbton und Sättigung bleiben unangetastet.
 * Wer Kupfer gewählt hat, bekommt helleres oder dunkleres Kupfer zurück, nie Grün. Damit ist
 * der Vorschlag eine Korrektur an der Absicht des Gestalters, kein Gegenentwurf.
 *
 * Gesucht wird die *kleinste* Verschiebung: die Helligkeit läuft von ihrem heutigen Wert in
 * beide Richtungen gleichzeitig nach außen, und der erste Treffer gewinnt. Bei Gleichstand
 * gewinnt die hellere Fassung — auf einer dunklen Fläche ist das die Richtung, in die der
 * Blick ohnehin will.
 *
 * Betrachtet werden **alle** erklärten Paarungen, in denen die Farbe vorkommt: auch die, in
 * denen sie der Hintergrund ist. Sonst repariert man den Text auf einer zarten Fläche und
 * zerbricht dabei die Statusfarbe, die auf derselben Fläche steht.
 */
import { THEME_CONTRAST_PAIRS, contrastRatio } from "./contrast.ts";
import { fail } from "./json.ts";
import { parseThemeManifest } from "./manifest.ts";
import type { ThemeColorToken, ThemeColors } from "./model.ts";

/** Schritte einer vollen Umdrehung der Helligkeitssuche. 512 Schritte auf 0…1 sind feiner
 * als die 256 Stufen, die ein Kanal überhaupt darstellen kann — die Suche verpasst also
 * keinen erreichbaren Wert. */
const SCHRITTE = 512;

function kanal(hex: string, versatz: number): number {
  return Number.parseInt(hex.slice(versatz, versatz + 2), 16) / 255;
}
/** #rrggbb -> HSL. Der Farbton ist bei grauen Werten undefiniert und wird dann 0. */
function nachHsl(hex: string): { h: number; s: number; l: number } {
  const r = kanal(hex, 1), g = kanal(hex, 3), b = kanal(hex, 5);
  const hoch = Math.max(r, g, b), tief = Math.min(r, g, b), l = (hoch + tief) / 2;
  if (hoch === tief) return { h: 0, s: 0, l };
  const spanne = hoch - tief;
  const s = l > 0.5 ? spanne / (2 - hoch - tief) : spanne / (hoch + tief);
  const h = (hoch === r ? (g - b) / spanne + (g < b ? 6 : 0) : hoch === g ? (b - r) / spanne + 2 : (r - g) / spanne + 4) / 6;
  return { h, s, l };
}
function zweistellig(wert: number): string {
  return Math.max(0, Math.min(255, Math.round(wert * 255))).toString(16).padStart(2, "0");
}
/** HSL -> #rrggbb, die übliche Umkehrung; `l` wird auf 0…1 geklemmt. */
function nachHex(h: number, s: number, l: number): string {
  const hell = Math.max(0, Math.min(1, l));
  if (s === 0) { const grau = zweistellig(hell); return `#${grau}${grau}${grau}`; }
  const q = hell < 0.5 ? hell * (1 + s) : hell + s - hell * s, p = 2 * hell - q;
  const anteil = (versatz: number) => {
    let stelle = h + versatz;
    if (stelle < 0) stelle += 1; else if (stelle > 1) stelle -= 1;
    if (stelle < 1 / 6) return p + (q - p) * 6 * stelle;
    if (stelle < 1 / 2) return q;
    if (stelle < 2 / 3) return p + (q - p) * (2 / 3 - stelle) * 6;
    return p;
  };
  return `#${zweistellig(anteil(1 / 3))}${zweistellig(anteil(0))}${zweistellig(anteil(-1 / 3))}`;
}

export interface ThemeColorSuggestion {
  readonly token: ThemeColorToken;
  /** Der heutige Wert — damit der Aufrufer „vorher/nachher" zeigen kann. */
  readonly current: string;
  /** Der Vorschlag, oder `null`, wenn auch die hellste und die dunkelste Fassung scheitern. */
  readonly suggestion: string | null;
  /** Die Paarungen, die diese Farbe heute verfehlt. Leer heißt: nichts zu reparieren. */
  readonly failing: readonly string[];
}

/** Alle erklärten Paarungen, in denen die Farbe vorkommt — als Vorder- oder als Hintergrund. */
function betroffenePaare(token: ThemeColorToken) {
  return THEME_CONTRAST_PAIRS.filter(paar => paar.foreground === token || paar.background === token);
}

function bestehtAlles(colors: ThemeColors, token: ThemeColorToken, wert: string): boolean {
  return betroffenePaare(token).every(paar => {
    const vorne = paar.foreground === token ? wert : colors[paar.foreground];
    const hinten = paar.background === token ? wert : colors[paar.background];
    return contrastRatio(vorne, hinten) >= paar.minimum;
  });
}

/**
 * Schlägt für eine Farbe den nächstliegenden Wert vor, der alle ihre Paarungen bestehen lässt.
 *
 * Besteht sie bereits alle, ist `suggestion` gleich `current` und `failing` leer: der Aufrufer
 * kann den Knopf dann ausblenden, statt eine Reparatur ohne Wirkung anzubieten.
 */
export function suggestAccessibleColor(manifestInput: unknown, token: ThemeColorToken): ThemeColorSuggestion {
  const manifest = parseThemeManifest(manifestInput);
  const colors = manifest.colors;
  if (!Object.hasOwn(colors, token)) fail(`token.${String(token)}`, "unknown color token");
  const current = colors[token];
  const failing = betroffenePaare(token)
    .filter(paar => contrastRatio(colors[paar.foreground], colors[paar.background]) < paar.minimum)
    .map(paar => paar.id);
  if (failing.length === 0) return Object.freeze({ token, current, suggestion: current, failing: Object.freeze([]) });

  const { h, s, l } = nachHsl(current);
  for (let schritt = 1; schritt <= SCHRITTE; schritt++) {
    const abstand = schritt / SCHRITTE;
    // Heller zuerst: bei gleichem Abstand gewinnt die Richtung, in die der Blick ohnehin will.
    for (const kandidat of [nachHex(h, s, l + abstand), nachHex(h, s, l - abstand)]) {
      if (kandidat !== current && bestehtAlles(colors, token, kandidat)) {
        return Object.freeze({ token, current, suggestion: kandidat, failing: Object.freeze(failing) });
      }
    }
  }
  // Kein Wert derselben Farbe besteht. Das ist kein Fehler, sondern eine Aussage: hier muss
  // der Gestalter die Gegenfarbe anfassen, nicht diese.
  return Object.freeze({ token, current, suggestion: null, failing: Object.freeze(failing) });
}
