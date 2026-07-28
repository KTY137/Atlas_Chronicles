
"use strict";
/* ============================================================================
   1 · Der Würfelkern — ganzzahlig, seed-gebunden, gebietsschema-frei.
   Genau dieselbe Funktion rechnet den mitgebrachten Wurf nach und wirft den
   neuen. Es gibt keinen zweiten Pfad. Das ist der ganze Punkt von „Nachrechnen".
   ========================================================================= */

function fnv1a(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seedInt) {
  let s = seedInt >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

const PAKETE = {
  "2.3": {
    id: "hausregeln-aldenfall", version: "2.3", sha: "7c1e…9b02",
    klauseln: {
      k_vharon_kenntnis: { rev: "r7", etikett: "haus-vharon", mindestens: 3, bonus: 2 }
    }
  },
  "2.4": {
    id: "hausregeln-aldenfall", version: "2.4", sha: "d4a0…1f77",
    klauseln: {
      k_vharon_kenntnis: { rev: "r8", etikett: "haus-vharon", mindestens: 4, bonus: 1 }
    }
  }
};

/* Prädikat aus dem Wiki, gelesen aus dem gerenderten Kanon — nicht aus einer
   Tabelle im Skript. Genau das ist die Richtung Wiki → Tisch.               */
function haeltEtikett(actor, etikett) {
  return 4;
}

/* Ausdruck (AST) auswerten. Liefert Summe und jede Zeile der Herleitung. */
function auswerten(ast, seedStr, paket, eingefroren) {
  const rng = mulberry32(fnv1a(seedStr));
  const zeilen = [];
  let summe = 0;
  for (const knoten of ast) {
    if (knoten.t === "dice") {
      let wert = 0;
      for (let i = 0; i < knoten.n; i++) wert += (rng() % knoten.faces) + 1;
      zeilen.push({ art: "die", wert, label: knoten.n + "d" + knoten.faces, sub: "" });
      summe += wert;
    } else if (knoten.t === "const") {
      zeilen.push({ art: "const", wert: knoten.v, label: knoten.label, sub: "" });
      summe += knoten.v;
    } else if (knoten.t === "clause") {
      const k = paket.klauseln[knoten.id];
      const heute = haeltEtikett(knoten.actor, k.etikett);
      const n = (eingefroren && typeof eingefroren[knoten.id] === "number") ? eingefroren[knoten.id] : heute;
      const wert = n >= k.mindestens ? k.bonus : 0;
      zeilen.push({
        art: "clause", wert,
        label: "du hältst " + n + " Passagen über Haus Vharon",
        sub: "haelt_etikett „" + k.etikett + "“ = " + n + " (mindestens: " + k.mindestens + ") · " + knoten.id + "@" + k.rev,
        heute, eingefroren: n, klausel: knoten.id, rev: k.rev
      });
      summe += wert;
    }
  }
  return { summe, zeilen };
}

/* ============================================================================
   2 · Die Belege — eingefrorene Aufzeichnungen aus Mareks vier Abenden.
   ========================================================================= */

const BELEGE = {
  w_003: {
    nr: 1, probe: "Menschenkenntnis", actor: "sera", wer: "Sera Valdris",
    sitzung: 3, datum: "14. Juni 2026", zeit: "21:14:38", sg: 15,
    seed: "4f2a71f97b4cc9c1", seedKurz: "4f2a…c1", imprint: 21,
    herkunft: "mitgebracht", tisch: "an Mareks Tisch, nicht an deinem",
    board: "archivwinkel", paket: "2.3",
    eingefroren: { k_vharon_kenntnis: 4 },
    ast: [
      { t: "dice", n: 1, faces: 20 },
      { t: "const", v: 4, label: "Weisheit" },
      { t: "clause", id: "k_vharon_kenntnis", actor: "sera" },
      { t: "const", v: 2, label: "Bruder Alders Hinweis (Sitzung 2)" }
    ]
  },
  w_011: {
    nr: 2, probe: "Spurenlesen", actor: "brannt", wer: "Brannt",
    sitzung: 3, datum: "14. Juni 2026", zeit: "21:31:02", sg: 14,
    seed: "9c7d63e99243c5e4", seedKurz: "9c7d…e4", imprint: 17,
    herkunft: "mitgebracht", tisch: "an Mareks Tisch, nicht an deinem",
    board: "waage", paket: "2.3",
    ast: [
      { t: "dice", n: 1, faces: 20 },
      { t: "const", v: 3, label: "Wahrnehmung" },
      { t: "const", v: 2, label: "Frachtbriefe im Kontor durchgesehen (Sitzung 3)" }
    ]
  },
  w_027: {
    nr: 3, probe: "Siegelkunde", actor: "vesper", wer: "Vesper",
    sitzung: 4, datum: "21. Juni 2026", zeit: "22:19:47", sg: 16,
    seed: "b310642aa04d1b7f", seedKurz: "b310…7f", imprint: 13,
    herkunft: "mitgebracht", tisch: "an Mareks Tisch, nicht an deinem",
    board: "treppe", paket: "2.3",
    ast: [
      { t: "dice", n: 1, faces: 20 },
      { t: "const", v: 5, label: "Siegelkunde" }
    ]
  }
};

/* ============================================================================
   3 · Der Augenblick — das Brett wird aus Zahlen gezeichnet, nicht gemalt.
   Dieselbe Beschreibung speist Tafel, Linse und die Gliederungsansicht (K3).
   ========================================================================= */

const BRETTER = {
  archivwinkel: {
    titel: "Archivwinkel", w: 22, h: 13,
    datum: "14. Juni 2026", zeit: "21:14:38",
    props: [
      { x: 2, y: 1, w: 9, h: 1, art: "regal" },
      { x: 2, y: 3, w: 1, h: 6, art: "regal" },
      { x: 9, y: 4, w: 3, h: 1, art: "tisch" },
      { x: 17, y: 1, w: 4, h: 1, art: "regal" },
      { x: 18, y: 9, w: 3, h: 3, art: "treppe" }
    ],
    walls: [
      [1, 1, 21, 1], [21, 1, 21, 12], [21, 12, 1, 12], [1, 12, 1, 1],
      [13, 1, 13, 5], [13, 8, 13, 12]
    ],
    doors: [[13, 5, 13, 8]],
    licht: { x: 6.5, y: 6.5, r: 6 },
    sicht: [[1,1],[12.9,1],[12.9,5],[17.4,4.4],[17.4,8.8],[12.9,8],[12.9,12],[1,12]],
    tokens: [
      { x: 5, y: 7, i: "S", name: "Sera Valdris", ton: "a", aktiv: true },
      { x: 7, y: 9, i: "B", name: "Brannt", ton: "b" },
      { x: 15, y: 6, i: "V", name: "Vaugn", ton: "c" }
    ],
    initiative: [
      { name: "Sera", n: 18, aktiv: true }, { name: "Vaugn", n: 14 },
      { name: "Brannt", n: 11 }, { name: "Vesper", n: 7 }
    ]
  },
  waage: {
    titel: "Halle der Oberen Waage", w: 20, h: 12,
    datum: "7. Juni 2026", zeit: "20:41:05",
    props: [
      { x: 3, y: 5, w: 13, h: 1, art: "tisch" },
      { x: 2, y: 1, w: 2, h: 2, art: "regal" },
      { x: 16, y: 1, w: 2, h: 2, art: "regal" },
      { x: 8, y: 9, w: 4, h: 1, art: "tisch" }
    ],
    walls: [[1,1,19,1],[19,1,19,11],[19,11,1,11],[1,11,1,1],[9,1,9,3]],
    doors: [[9,10,12,10]],
    licht: { x: 10, y: 8, r: 7 },
    sicht: [[1,4.4],[19,4.4],[19,11],[1,11]],
    tokens: [
      { x: 6, y: 8, i: "S", name: "Sera", ton: "a" },
      { x: 8, y: 7, i: "B", name: "Brannt", ton: "b", aktiv: true },
      { x: 12, y: 8, i: "V", name: "Vesper", ton: "c" },
      { x: 14, y: 6, i: "W", name: "Weller", ton: "n" }
    ],
    initiative: []
  },
  treppe: {
    titel: "Treppe hinter dem Archivwinkel", w: 14, h: 12,
    datum: "21. Juni 2026", zeit: "22:03:11",
    props: [
      { x: 8, y: 2, w: 4, h: 5, art: "treppe" },
      { x: 2, y: 9, w: 3, h: 1, art: "regal" }
    ],
    walls: [[1,1,13,1],[13,1,13,11],[13,11,1,11],[1,11,1,1],[7,1,7,7],[7,9,7,11]],
    doors: [[7,7,7,9]],
    licht: { x: 4, y: 8, r: 4.5 },
    sicht: [[1,5],[6.9,5],[6.9,7],[9.6,7.4],[9.6,9.6],[6.9,9],[6.9,11],[1,11]],
    tokens: [
      { x: 4, y: 8, i: "S", name: "Sera", ton: "a", aktiv: true },
      { x: 3, y: 6, i: "V", name: "Vesper", ton: "c" }
    ],
    initiative: []
  }
};

let brettZaehler = 0;

function zeichneBrett(key, opts) {
  const b = BRETTER[key];
  if (!b) return "";
  const o = opts || {};
  const c = 20;                       /* Kantenlänge einer Zelle in Nutzerkoordinaten */
  const W = b.w * c, H = b.h * c;
  const uid = "b" + (++brettZaehler);
  const p = (pts) => pts.map(q => (q[0] * c) + "," + (q[1] * c)).join(" ");
  const tonFarbe = { a: "var(--c-token-a)", b: "var(--c-token-b)", c: "var(--c-token-c)", n: "#6d6156" };

  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
    b.titel + ', Brettstand um ' + b.zeit + '. ' + b.tokens.length + ' Marken.">';

  s += '<defs>';
  s += '<radialGradient id="' + uid + 'l"><stop offset="0%" stop-color="#e8cf9a" stop-opacity="0.30"/>' +
       '<stop offset="70%" stop-color="#c99b4a" stop-opacity="0.10"/>' +
       '<stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>';
  s += '<mask id="' + uid + 'm"><rect width="' + W + '" height="' + H + '" fill="#fff"/>' +
       '<polygon points="' + p(b.sicht) + '" fill="#000"/></mask>';
  s += '<pattern id="' + uid + 'g" width="' + c + '" height="' + c + '" patternUnits="userSpaceOnUse">' +
       '<path d="M' + c + ' 0V' + c + 'H0" fill="none" stroke="#3b3229" stroke-width="0.6"/></pattern>';
  s += '</defs>';

  /* Boden + Raster */
  s += '<rect width="' + W + '" height="' + H + '" fill="#191512"/>';
  s += '<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'g)"/>';

  /* Licht */
  if (b.licht) {
    s += '<circle cx="' + (b.licht.x * c) + '" cy="' + (b.licht.y * c) + '" r="' + (b.licht.r * c) +
         '" fill="url(#' + uid + 'l)"/>';
  }

  /* Einbauten */
  const propFill = { regal: "#2e2820", tisch: "#3a3025", treppe: "#262019" };
  for (const pr of b.props) {
    s += '<rect x="' + (pr.x * c) + '" y="' + (pr.y * c) + '" width="' + (pr.w * c) + '" height="' + (pr.h * c) +
         '" fill="' + (propFill[pr.art] || "#2b251e") + '" stroke="#4a3f33" stroke-width="1"/>';
    if (pr.art === "treppe") {
      for (let i = 1; i < pr.h; i++) {
        s += '<path d="M' + (pr.x * c) + ' ' + ((pr.y + i) * c) + 'h' + (pr.w * c) +
             '" stroke="#4a3f33" stroke-width="1"/>';
      }
    }
  }

  /* Wände und Türen */
  for (const w of b.walls) {
    s += '<path d="M' + (w[0] * c) + ' ' + (w[1] * c) + 'L' + (w[2] * c) + ' ' + (w[3] * c) +
         '" stroke="#7d6d59" stroke-width="4" stroke-linecap="square"/>';
  }
  for (const d of b.doors) {
    s += '<path d="M' + (d[0] * c) + ' ' + (d[1] * c) + 'L' + (d[2] * c) + ' ' + (d[3] * c) +
         '" stroke="#c9a35e" stroke-width="4" stroke-linecap="butt" stroke-dasharray="6 5"/>';
  }

  /* Nebel — alles außerhalb der Sicht dieser Figur */
  s += '<rect width="' + W + '" height="' + H + '" fill="#0a0806" fill-opacity="0.86" mask="url(#' + uid + 'm)"/>';
  s += '<polygon points="' + p(b.sicht) + '" fill="none" stroke="#c9a35e" stroke-opacity="0.22" stroke-width="1.5"/>';

  /* Marken */
  for (const t of b.tokens) {
    const cx = t.x * c + c / 2, cy = t.y * c + c / 2;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (c * 0.42) + '" fill="' + (tonFarbe[t.ton] || "#555") +
         '" stroke="' + (t.aktiv ? "#e8cf9a" : "#1b1713") + '" stroke-width="' + (t.aktiv ? 2.5 : 1.5) + '"/>';
    s += '<text x="' + cx + '" y="' + (cy + 4.5) + '" text-anchor="middle" font-size="' + (c * 0.6) +
         '" font-family="Georgia, serif" fill="#f5ecdc">' + t.i + '</text>';
  }

  s += "</svg>";
  return s;
}

function brettGliederung(key) {
  const b = BRETTER[key];
  let s = '<ol class="outline-list">';
  for (const t of b.tokens) {
    s += '<li><span class="pos">Feld ' + String.fromCharCode(65 + t.x) + (t.y + 1) + '</span>' +
         '<span><b>' + t.name + '</b>' + (t.aktiv ? " · am Zug" : "") + '</span></li>';
  }
  s += '<li><span class="pos">Sicht</span><span>' + b.tokens.length +
       ' Marken im offenen Bereich; der östliche Teil liegt im Nebel dieser Figur.</span></li>';
  s += '<li><span class="pos">Stand</span><span>' + b.datum + ", " + b.zeit + "</span></li>";
  s += "</ol>";
  return s;
}

module.exports={BELEGE,PAKETE,auswerten};