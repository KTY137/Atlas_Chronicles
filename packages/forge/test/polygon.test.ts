import { describe, expect, it } from "vitest";
import {
  clipHalbebene, doppelflaeche, einwaerts, flaeche, imPolygon, lloyd, q, schwerpunkt,
  teileInParzellen, voronoi, type Polygon, type Punkt,
} from "../src/polygon.ts";

/**
 * Gate **A-G7 · Der Polygonkern** — die Geometrie, auf der `erzeugeSiedlung` seit Fassung 2 steht.
 *
 * Diese Datei ist entstanden, um eine **Ableitung** zu prüfen statt nur ein Ergebnis — und hat
 * beim ersten Lauf genau dafür ihren Preis eingespielt. Die Annahme lautete:
 *
 *   1. eine Voronoizelle ist konvex, und
 *   2. ein Sehnenschnitt liefert zwei Teile, die **beide** den ursprünglichen Rand berühren,
 *
 * also grenze jedes Gebäude ohne weitere Prüfung an eine Gasse. Punkt 1 stimmt. **Punkt 2 stimmt
 * nur für den ersten Schnitt.** Danach besteht der Rand eines Teils aus Originalkanten und
 * früheren Schnittkanten, und ein Enkelstück kann ausschliesslich an Schnittkanten liegen — der
 * Test unten führt so ein Mittelstück vor. Die Zusage des Generators hängt seither an einem
 * ausdrücklichen Abstandstest, nicht an dieser Ableitung.
 *
 * Das ist der Grund, warum ein Geometriekern eigene Tests braucht: ein eingemauertes Haus sieht
 * auf der Karte aus wie ein Haus.
 */

const RAHMEN: Polygon = [[0, 0], [40, 0], [40, 30], [0, 30]];
/** Deterministische Ziehung ohne Zufall — die Eigenschaften gelten für jede Folge. */
const festeZahl = (folge: readonly number[]) => {
  let i = 0;
  return { zahl: (min: number, max: number) => min + (max - min) * folge[i++ % folge.length]! };
};

function istKonvex(poly: Polygon): boolean {
  let positiv = false, negativ = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!, c = poly[(i + 2) % poly.length]!;
    const kreuz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (kreuz > 1e-7) positiv = true;
    if (kreuz < -1e-7) negativ = true;
  }
  return !(positiv && negativ);
}

/** Kleinster Abstand eines Punktes zum Rand eines Polygons. */
function randAbstand(p: Punkt, poly: Polygon): number {
  let klein = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!, b = poly[i]!;
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const qq = vx * vx + vy * vy;
    const t = qq < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / qq));
    klein = Math.min(klein, Math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1]));
  }
  return klein;
}

const PUNKTE: Punkt[] = [
  [7, 6], [21, 4], [33, 9], [11, 17], [26, 15], [36, 22], [5, 25], [19, 27], [30, 28],
];

describe("A-G7 · Polygonkern — Voronoi", () => {
  const zellen = voronoi(PUNKTE, RAHMEN);

  it("gibt jedem Punkt eine Zelle, die ihn enthält", () => {
    for (const [i, p] of PUNKTE.entries()) {
      expect(zellen[i]!.length, `Punkt ${i}`).toBeGreaterThanOrEqual(3);
      expect(imPolygon(p, zellen[i]!), `Punkt ${i} liegt nicht in seiner eigenen Zelle`).toBe(true);
    }
  });

  it("liefert ausschliesslich konvexe Zellen — die Voraussetzung des ganzen Parzellenschnitts", () => {
    for (const [i, zelle] of zellen.entries()) expect(istKonvex(zelle), `Zelle ${i}`).toBe(true);
  });

  it("kachelt den Rahmen lückenlos und überlappungsfrei", () => {
    const summe = zellen.reduce((s, z) => s + flaeche(z), 0);
    expect(summe).toBeCloseTo(flaeche(RAHMEN), 6);
  });

  it("ordnet jeden Ort dem nächstgelegenen Punkt zu — die definierende Eigenschaft", () => {
    for (let x = 0.5; x < 40; x += 2.5) {
      for (let y = 0.5; y < 30; y += 2.5) {
        const p: Punkt = [x, y];
        let naechster = 0;
        for (let i = 1; i < PUNKTE.length; i++) {
          const d = (PUNKTE[i]![0] - x) ** 2 + (PUNKTE[i]![1] - y) ** 2;
          if (d < (PUNKTE[naechster]![0] - x) ** 2 + (PUNKTE[naechster]![1] - y) ** 2) naechster = i;
        }
        expect(imPolygon(p, zellen[naechster]!), `${x}:${y} gehört zu Punkt ${naechster}`).toBe(true);
      }
    }
  });

  it("bleibt unter Lloyd-Relaxation eine Zerlegung, nur gleichmässiger", () => {
    const vorher = voronoi(PUNKTE, RAHMEN).map(flaeche);
    const nachher = voronoi(lloyd(PUNKTE, RAHMEN, 3), RAHMEN).map(flaeche);
    const streuung = (werte: number[]) => {
      const m = werte.reduce((a, b) => a + b, 0) / werte.length;
      return Math.sqrt(werte.reduce((a, b) => a + (b - m) ** 2, 0) / werte.length);
    };
    expect(nachher.reduce((a, b) => a + b, 0)).toBeCloseTo(flaeche(RAHMEN), 6);
    // Der ganze Zweck der Relaxation: weniger Splitterzellen, in denen keine Parzelle Platz hat.
    expect(streuung(nachher)).toBeLessThan(streuung(vorher));
  });

  it("ist reproduzierbar — dieselben Punkte, dieselben Bytes", () => {
    const a = JSON.stringify(voronoi(lloyd(PUNKTE, RAHMEN, 2), RAHMEN));
    const b = JSON.stringify(voronoi(lloyd(PUNKTE, RAHMEN, 2), RAHMEN));
    expect(a).toBe(b);
  });
});

describe("A-G7 · Polygonkern — Halbebene und Versatz", () => {
  it("behält genau die Punkte, die die Bedingung erfüllen", () => {
    const geschnitten = clipHalbebene(RAHMEN, 1, 0, 15);
    for (const p of geschnitten) expect(p[0]).toBeLessThanOrEqual(15 + 1e-6);
    expect(flaeche(geschnitten)).toBeCloseTo(15 * 30, 6);
  });

  it("gibt bei leerem Schnitt kein entartetes Polygon zurück, sondern nichts", () => {
    expect(clipHalbebene(RAHMEN, 1, 0, -5)).toHaveLength(0);
  });

  it("versetzt ein konvexes Polygon exakt einwärts", () => {
    const klein = einwaerts(RAHMEN, 2);
    expect(flaeche(klein)).toBeCloseTo(36 * 26, 6);
    // Jeder Punkt des Ergebnisses liegt mindestens `abstand` vom ursprünglichen Rand entfernt.
    for (const p of klein) expect(randAbstand(p, RAHMEN)).toBeGreaterThan(2 - 1e-6);
  });

  it("versetzt sich selbst zu nichts, wenn der Abstand die Figur übersteigt", () => {
    expect(einwaerts(RAHMEN, 20)).toHaveLength(0);
  });

  it("versetzt unabhängig vom Umlaufsinn gleich", () => {
    const rueckwaerts = [...RAHMEN].reverse();
    expect(doppelflaeche(rueckwaerts)).toBeLessThan(0);
    expect(flaeche(einwaerts(rueckwaerts, 2))).toBeCloseTo(flaeche(einwaerts(RAHMEN, 2)), 6);
  });
});

describe("A-G7 · Polygonkern — Parzellenschnitt", () => {
  const folgen = [[0.5], [0.1, 0.9, 0.3], [0.72, 0.18, 0.44, 0.91]];

  it("zerlegt vollständig: die Teile ergeben zusammen wieder das Ganze", () => {
    for (const folge of folgen) {
      for (const zelle of voronoi(PUNKTE, RAHMEN)) {
        const teile = teileInParzellen(zelle, 6, festeZahl(folge));
        expect(teile.reduce((s, t) => s + flaeche(t), 0)).toBeCloseTo(flaeche(zelle), 5);
      }
    }
  });

  it("hält die Zielgrösse ein, solange die Tiefe reicht", () => {
    for (const zelle of voronoi(PUNKTE, RAHMEN)) {
      for (const teil of teileInParzellen(zelle, 6, festeZahl([0.5]), 9)) {
        expect(flaeche(teil)).toBeLessThanOrEqual(6 + 1e-6);
      }
    }
  });

  it("erzeugt auch Parzellen im Blockinneren — die Ableitung, die NICHT trägt", () => {
    // Das Gegenbeispiel steht hier als Regressionsschutz. Verschwände es eines Tages, wäre die
    // alte Annahme vielleicht wieder aus Versehen wahr — und jemand würde den Abstandstest in
    // erzeugeSiedlung als überflüssig streichen. Dieser Test hält fest, dass er es nicht ist.
    let innen = 0, gesamt = 0;
    for (const folge of folgen) {
      for (const zelle of voronoi(PUNKTE, RAHMEN)) {
        for (const teil of teileInParzellen(zelle, 5, festeZahl(folge))) {
          gesamt++;
          if (!teil.some((p) => randAbstand(p, zelle) < 1e-6)) innen++;
        }
      }
    }
    expect(gesamt).toBeGreaterThan(20);
    expect(innen, "kein einziges Blockinneres — dann wäre die alte Annahme doch tragfähig").toBeGreaterThan(0);
  });

  it("legt jede Parzelle vollständig in das ursprüngliche Polygon", () => {
    for (const zelle of voronoi(PUNKTE, RAHMEN)) {
      for (const teil of teileInParzellen(zelle, 5, festeZahl([0.4, 0.75]))) {
        const s = schwerpunkt(teil);
        expect(imPolygon(s, zelle), `Schwerpunkt ${s.map(q).join(":")} liegt ausserhalb`).toBe(true);
      }
    }
  });

  it("liefert nur konvexe Parzellen — Sehnenschnitte erhalten Konvexität", () => {
    for (const zelle of voronoi(PUNKTE, RAHMEN)) {
      for (const teil of teileInParzellen(zelle, 5, festeZahl([0.35, 0.8]))) {
        expect(istKonvex(teil)).toBe(true);
      }
    }
  });

  it("hört bei erreichter Zielgrösse sofort auf, statt bis zur Tiefengrenze zu schneiden", () => {
    const klein: Polygon = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(teileInParzellen(klein, 100, festeZahl([0.5]))).toStrictEqual([klein]);
  });
});

describe("A-G7 · Polygonkern — Quantisierung", () => {
  it("rundet auf Tausendstel und macht aus minus null eine Null", () => {
    expect(q(1 / 3)).toBe(0.333);
    expect(Object.is(q(-0.0001), 0)).toBe(true);
  });

  it("liefert für den Schwerpunkt eines Rechtecks dessen Mitte", () => {
    const s = schwerpunkt(RAHMEN);
    expect(s[0]).toBeCloseTo(20, 9);
    expect(s[1]).toBeCloseTo(15, 9);
  });
});
