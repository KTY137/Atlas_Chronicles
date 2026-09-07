// Der Pinsel — gemalte Materialien für `pk.gemalt`.
//
// `tusche.mjs` zeichnet Symbole: flache Flächen, eine Konturstärke, lesbar bei 64 px. Das ist die
// richtige Sprache für eine Übersichtskarte und die falsche für eine Battlemap, auf die man
// hineinzoomt. Diese Datei ist die zweite Hand: Materialien statt Zeichen — Verlauf für die Form,
// `feTurbulence` für das Korn, dunkle Fugen mit Umgebungsverdeckung, eine Lichtkante oben links.
//
// **Warum Vektor und nicht gemalte Rasterbilder.** Die drei PNGs unter
// `assets/generated/painted-dungeon-v1/` sehen gut aus, und ihr eigenes README nennt den Grund,
// warum sie nicht als Paket registriert sind: *"Distribution grant: pending the project's
// licensing decision"*. Der Paketvertrag verlangt pro Asset eine auflösbare Lizenz mit gehashtem
// Text (RB-21d §6.1), und `herkunft: "eigen"` heisst „in diesem Repository erzeugt". Ein Paket,
// das aus einem Fremdwerkzeug stammt und dessen Rechtelage offen ist, kann beides nicht behaupten.
// Diese Datei erzeugt denselben Eindruck aus Funktionen, die im Repository stehen: reproduzierbar
// unter `--pruefe`, CC0 ohne Vorbehalt, und beliebig skalierbar statt auf 1254 px festgenagelt.
//
// Filter und Verläufe sind vom Assetgate ausdrücklich erlaubt: verboten ist `url(` **ohne** `#`,
// also jeder Abruf nach draussen. `url(#korn)` zeigt in dieselbe Datei und ist eine Zeichnung.

import { attrs, n, rect } from "./tusche.mjs";

// ---------------------------------------------------------------------------------------------
// Materialpalette — abgelesen an den gemalten Vorlagen, nicht an der Tuschepalette
// ---------------------------------------------------------------------------------------------

export const M = {
  // Stein: kühles Schiefergrau mit warmem Umbra-Einschlag, dunkle Fuge.
  stein: "#6e6963", steinHell: "#928b80", steinTief: "#4a463f", fuge: "#2b2823",
  // Holz: warmes Eiche, Umbra in den Fugen, fast schwarze Ritze.
  holz: "#8a5f34", holzHell: "#b1854f", holzTief: "#5b3d1e", holzRitze: "#33210f",
  // Erde und Fels.
  erde: "#6b5b45", erdeHell: "#8a785d", erdeTief: "#453a2b",
  fels: "#6a655d", felsHell: "#8d867a", felsTief: "#413d37",
  // Metall, kalt und leicht blaustichig, damit es sich von Stein trennt.
  metall: "#7c8087", metallHell: "#a6abb2", metallTief: "#4c5057",
  eisen: "#4a4038", eisenHell: "#6d6055",
  // Akzente.
  tuch: "#8a4034", tuchTief: "#5a2620",
  gold: "#c8963c", goldTief: "#8a6220",
  flamme: "#e8933a", flammeHell: "#f7d27a",
  wasser: "#4e6f7d", wasserHell: "#7ea3af",
  knochen: "#cfc7ad",
  gruen: "#5f7145", gruenHell: "#89996a",
  pilz: "#8b6f93",
  schatten: "#1a1713",
};

// ---------------------------------------------------------------------------------------------
// Filter- und Verlaufsbausteine. Jede Datei trägt ihre eigenen `defs`; ein Paket-Asset ist eine
// eigenständige Zeichnung und darf nichts aus einer Nachbardatei holen.
// ---------------------------------------------------------------------------------------------

/**
 * Korn. Multipliziert Fraktalrauschen auf das, was darunter gezeichnet wurde — das ist der
 * gesamte Unterschied zwischen „Fläche in Steinfarbe" und „gemalter Stein".
 * `staerke` 0.2 ist ein Hauch, 0.7 ist grober Fels.
 */
/**
 * `baseFrequency` darf ein **Wertepaar** sein ("0.02 1.1" = fein quer, grob laengs) — genau das
 * braucht Holzmaserung. `n()` haette daraus `NaN` gerechnet und der Browser haette den ganzen
 * Filter verworfen: das Asset sah dann flach aus, ohne dass irgendetwas rot wurde.
 */
const frequenzWert = (wert) => (typeof wert === "number" ? n(wert) : String(wert));

export function korn(id, { frequenz = 0.7, oktaven = 4, saat = 3, staerke = 0.42 } = {}) {
  return `<filter id="${id}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${frequenzWert(frequenz)}" numOctaves="${oktaven}" seed="${saat}" result="rauschen"/>`
    + `<feColorMatrix in="rauschen" type="saturate" values="0" result="grau"/>`
    + `<feComponentTransfer in="grau" result="weich"><feFuncA type="linear" slope="${n(staerke)}" intercept="0"/></feComponentTransfer>`
    // `in` beschneidet das Rauschen auf die Silhouette: sonst legt sich Korn auch neben den Umriss.
    + `<feComposite in="weich" in2="SourceGraphic" operator="in" result="beschnitten"/>`
    + `<feBlend in="SourceGraphic" in2="beschnitten" mode="multiply"/>`
    + `</filter>`;
}

/**
 * Verwitterung. Grobes, niedrigfrequentes Rauschen, das Flecken statt Körnung macht — Wasserränder
 * auf Stein, ungleich gealtertes Holz.
 */
export function flecken(id, { frequenz = 0.06, oktaven = 3, saat = 9, staerke = 0.3 } = {}) {
  return korn(id, { frequenz, oktaven, saat, staerke });
}

/** Weiche Kante nach innen: die Umgebungsverdeckung, die eine Fuge zur Fuge macht. */
export function weichzeichner(id, standardabweichung = 1.4) {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">`
    + `<feGaussianBlur stdDeviation="${n(standardabweichung)}"/></filter>`;
}

/** Linearer Verlauf. `winkel` in Grad, 0 = von links nach rechts, 90 = von oben nach unten. */
export function verlauf(id, stopps, winkel = 125) {
  const rad = (winkel * Math.PI) / 180;
  const dx = Math.cos(rad) / 2, dy = Math.sin(rad) / 2;
  const punkte = stopps.map(([offset, farbe, deckung]) =>
    `<stop${attrs({ offset: `${Math.round(offset * 100)}%`, "stop-color": farbe, "stop-opacity": deckung })}/>`).join("");
  return `<linearGradient id="${id}" x1="${n(0.5 - dx)}" y1="${n(0.5 - dy)}" x2="${n(0.5 + dx)}" y2="${n(0.5 + dy)}">${punkte}</linearGradient>`;
}

/** Radialer Verlauf — Wölbung eines Fasses, Lichtkegel einer Flamme, Muldenboden einer Grube. */
export function rundverlauf(id, stopps, cx = 0.38, cy = 0.32, r = 0.78) {
  const punkte = stopps.map(([offset, farbe, deckung]) =>
    `<stop${attrs({ offset: `${Math.round(offset * 100)}%`, "stop-color": farbe, "stop-opacity": deckung })}/>`).join("");
  return `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}">${punkte}</radialGradient>`;
}

export const defs = (...teile) => `<defs>${teile.join("")}</defs>`;

/**
 * Zwei Farben mischen. Gemalter Stein lebt davon, dass **jede** Platte einen eigenen Wert hat;
 * eine durchsichtige Aufhellung darüber würde stattdessen die Fugen mit aufhellen. Deshalb wird
 * die Farbe gerechnet und nicht überlagert. Ergebnis ist auf ganze Kanäle gerundet, also
 * plattformunabhängig identisch.
 */
export function mische(a, b, t) {
  const lies = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = lies(a), [br, bg, bb] = lies(b);
  const kanal = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${kanal(ar, br)}${kanal(ag, bg)}${kanal(ab, bb)}`;
}

// ---------------------------------------------------------------------------------------------
// Wiederkehrende Malgriffe
// ---------------------------------------------------------------------------------------------

/**
 * Ein Materialkörper: Grundform in Verlauf, Korn darüber, dunkle Innenkante als Verdeckung und
 * eine helle Kante oben links. Vier Ebenen sind das Minimum, ab dem eine Fläche gemalt aussieht
 * statt gefärbt — mit weniger bleibt es ein Icon mit Farbverlauf.
 */
export function koerper(form, { fuellung, kornId, kante = M.schatten, kantenBreite = 1.6, licht = null }) {
  const teile = [form({ fill: fuellung, filter: `url(#${kornId})` })];
  if (licht) teile.push(form({ fill: "none", stroke: licht, "stroke-width": 1.1, "stroke-opacity": 0.45, transform: "translate(-0.7 -0.7)" }));
  teile.push(form({ fill: "none", stroke: kante, "stroke-width": kantenBreite, "stroke-opacity": 0.72, "stroke-linejoin": "round" }));
  return teile.join("");
}

/** Fuge mit Verdeckung: erst ein weicher dunkler Streifen, darauf die scharfe Linie. */
export function fuge(x1, y1, x2, y2, weichId, { breite = 1.6, farbe = M.fuge, deckung = 0.85 } = {}) {
  return `<line${attrs({ x1, y1, x2, y2, stroke: farbe, "stroke-width": breite * 2.2, "stroke-opacity": deckung * 0.45, "stroke-linecap": "round", filter: `url(#${weichId})` })}/>`
    + `<line${attrs({ x1, y1, x2, y2, stroke: farbe, "stroke-width": breite, "stroke-opacity": deckung, "stroke-linecap": "round" })}/>`;
}

/** Deckt eine ganze Kachel mit Grundfarbe plus Korn — der erste Strich jedes Bodens. */
export function grund(groesse, farbe, kornId) {
  return rect(0, 0, groesse, groesse, { fill: farbe, filter: `url(#${kornId})` });
}
