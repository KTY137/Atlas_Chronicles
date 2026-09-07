/**
 * **Polygonwerkzeug für organisch gewachsene Karten.**
 *
 * `kartenwerk.ts` rechnet auf einem Zellraster: ein Raum ist ein Rechteck, eine Wand eine
 * Kante zwischen zwei Zellen. Das ist für einen gebauten Grundriss richtig und für eine
 * gewachsene Siedlung falsch — eine mittelalterliche Stadt hat keine achsenparallelen Blöcke,
 * sie hat Viertel mit schiefen Rändern, und genau das sieht man einer Karte sofort an.
 *
 * Dieses Modul liefert die Geometrie dafür, und zwar in der Reihenfolge, in der ein
 * Stadtgenerator sie braucht (Parish/Müller, *Procedural Modeling of Cities*, und die
 * Voronoi-Viertel, die jeder brauchbare mittelalterliche Kartengenerator seither benutzt):
 *
 *   Punkte streuen → **Voronoi** → Lloyd-Relaxation → Viertel wählen → Rand einwärts →
 *   rekursiv in Parzellen schneiden.
 *
 * Drei Entscheidungen, die nicht Geschmack sind:
 *
 *  1. **Voronoi über Halbebenen-Clipping, nicht über Fortune.** Eine Zelle ist der Schnitt aller
 *     Halbebenen „näher an mir als an dir". Das ist O(n²) statt O(n log n) und bei den 40–160
 *     Punkten einer Siedlung völlig gleichgültig — dafür sind es dreissig Zeilen ohne
 *     Beach-Line, ohne Ereigniswarteschlange und ohne die Entartungsfälle, an denen kurze
 *     Fortune-Implementierungen scheitern. Ein Generator, dessen Geometrie man nicht im Kopf
 *     nachrechnen kann, ist an dieser Stelle kein Gewinn.
 *  2. **Keine Trigonometrie.** `Math.sin`/`cos` sind nicht bitgleich über Engines und
 *     Plattformen; `+ - * /` und `Math.sqrt` sind es nach IEEE-754. Jede Richtung hier ist ein
 *     Vektor, den wir normieren, nie ein Winkel. Der `Weltkeim` verspricht Reproduzierbarkeit —
 *     dieses Versprechen an einem Kosinus zu verlieren wäre absurd.
 *  3. **Voronoizellen sind konvex, und das trägt zwei Dinge.** Ein konvexes Polygon lässt sich
 *     exakt einwärts versetzen (jede Kante als Halbebene nach innen schieben), und ein
 *     Sehnenschnitt erhält die Konvexität, also gilt das für jede Parzelle weiter.
 *
 * Und eine Behauptung, die hier **stand und falsch war**, weil `polygon.test.ts` sie beim ersten
 * Lauf umgeworfen hat: „jede Parzelle berührt den ursprünglichen Rand, also grenzt jedes Gebäude
 * ohne Reparaturlauf an eine Gasse". Das gilt für *einen* Schnitt, nicht für den Baum darüber:
 * der Rand eines Teils besteht danach aus Originalkanten **und** früheren Schnittkanten, und ein
 * Enkelstück kann ausschliesslich an Schnittkanten liegen — vier Schnitte ringsum ergeben ein
 * Mittelstück im Inneren. `erzeugeSiedlung` verwirft solche Lose deshalb ausdrücklich über ihren
 * Abstand zur nächsten Gasse. Die Invariante ist eine Prüfung, keine Geometrie; das hier
 * festzuhalten ist billiger, als sie ein zweites Mal zu glauben.
 */

export type Punkt = readonly [number, number];
export type Polygon = readonly Punkt[];

/** Quantisierung auf Tausendstel. Geometrie wird kanonisch serialisiert und gehasht; Reste aus
 *  der Gleitkommarechnung dürfen nicht in die Bytes durchschlagen. */
export const q = (wert: number): number => {
  const gerundet = Math.round(wert * 1000) / 1000;
  return Object.is(gerundet, -0) ? 0 : gerundet;
};
export const qp = (p: Punkt): Punkt => [q(p[0]), q(p[1])];

/** Doppelte vorzeichenbehaftete Fläche. Positiv bei mathematisch positivem Umlaufsinn. */
export function doppelflaeche(poly: Polygon): number {
  let summe = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    summe += poly[j]![0] * poly[i]![1] - poly[i]![0] * poly[j]![1];
  }
  return summe;
}

export const flaeche = (poly: Polygon): number => Math.abs(doppelflaeche(poly)) / 2;

/** Flächenschwerpunkt. Fällt bei entarteter Fläche auf den Mittelwert der Ecken zurück. */
export function schwerpunkt(poly: Polygon): Punkt {
  const a2 = doppelflaeche(poly);
  if (Math.abs(a2) < 1e-9) {
    let sx = 0, sy = 0;
    for (const p of poly) { sx += p[0]; sy += p[1]; }
    return [sx / poly.length, sy / poly.length];
  }
  let cx = 0, cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const kreuz = poly[j]![0] * poly[i]![1] - poly[i]![0] * poly[j]![1];
    cx += (poly[j]![0] + poly[i]![0]) * kreuz;
    cy += (poly[j]![1] + poly[i]![1]) * kreuz;
  }
  return [cx / (3 * a2), cy / (3 * a2)];
}

/**
 * Sutherland-Hodgman gegen **eine** Halbebene: behalte alles mit `nx*x + ny*y <= c`.
 * Der einzige Schnittoperator, den dieses Modul braucht — Voronoi, Einwärtsversatz und
 * Parzellenschnitt sind alle nur wiederholte Anwendungen davon.
 */
export function clipHalbebene(poly: Polygon, nx: number, ny: number, c: number): Polygon {
  if (!poly.length) return poly;
  const raus: Punkt[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!, b = poly[i]!;
    const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    const aDrin = da <= 1e-9, bDrin = db <= 1e-9;
    if (aDrin !== bDrin) {
      const t = da / (da - db);
      raus.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    if (bDrin) raus.push(b);
  }
  return raus.length >= 3 ? raus : [];
}

/**
 * Die Voronoizelle eines Punktes innerhalb `rahmen`: alle Halbebenen „näher an `mir` als an
 * `andere`" geschnitten. Die Bisektrice zwischen p und q ist `(q-p)·x = (|q|²-|p|²)/2`.
 */
export function voronoiZelle(mir: Punkt, alle: readonly Punkt[], rahmen: Polygon): Polygon {
  let zelle = rahmen;
  for (const andere of alle) {
    if (andere[0] === mir[0] && andere[1] === mir[1]) continue;
    const nx = andere[0] - mir[0], ny = andere[1] - mir[1];
    const c = (andere[0] * andere[0] + andere[1] * andere[1] - mir[0] * mir[0] - mir[1] * mir[1]) / 2;
    zelle = clipHalbebene(zelle, nx, ny, c);
    if (!zelle.length) break;
  }
  return zelle;
}

export const voronoi = (punkte: readonly Punkt[], rahmen: Polygon): Polygon[] =>
  punkte.map((p) => voronoiZelle(p, punkte, rahmen));

/**
 * Lloyd-Relaxation: jeder Punkt wandert auf den Schwerpunkt seiner Zelle. Zwei bis drei Runden
 * verwandeln eine zufällige Streuung in gleichmässig grosse Viertel, ohne die Unregelmässigkeit
 * zu verlieren, die den organischen Eindruck trägt. Ohne sie gibt es lange Splitter-Viertel,
 * in denen keine Parzelle Platz hat.
 */
export function lloyd(punkte: readonly Punkt[], rahmen: Polygon, runden: number): Punkt[] {
  let aktuell = punkte.map((p) => [p[0], p[1]] as Punkt);
  for (let runde = 0; runde < runden; runde++) {
    aktuell = aktuell.map((p) => {
      const zelle = voronoiZelle(p, aktuell, rahmen);
      return zelle.length >= 3 ? schwerpunkt(zelle) : p;
    });
  }
  return aktuell;
}

/**
 * Konvexes Polygon um `abstand` einwärts versetzen: jede Kante wird als Halbebene um genau
 * diesen Abstand nach innen geschoben. Für konvexe Polygone ist das der exakte Versatz, kein
 * Näherungsverfahren — und Voronoizellen sind konvex.
 */
export function einwaerts(poly: Polygon, abstand: number): Polygon {
  if (poly.length < 3) return [];
  const positiv = doppelflaeche(poly) > 0;
  let ergebnis = poly;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!, b = poly[i]!;
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const laenge = Math.sqrt(ex * ex + ey * ey);
    if (laenge < 1e-9) continue;
    // Aussennormale, abhängig vom Umlaufsinn.
    const nx = (positiv ? ey : -ey) / laenge, ny = (positiv ? -ex : ex) / laenge;
    ergebnis = clipHalbebene(ergebnis, nx, ny, nx * a[0] + ny * a[1] - abstand);
    if (!ergebnis.length) return [];
  }
  return ergebnis;
}

/** Achsparalleles umschliessendes Rechteck als `[minX, minY, maxX, maxY]`. */
export function huelle(poly: Polygon): readonly [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

/** Punkt im Polygon, Strahlverfahren. Randfälle zählen als aussen — Zellmitten liegen nie exakt
 *  auf einer Kante, und ein Boden doppelt zu setzen wäre schlimmer als ihn zu verpassen. */
export function imPolygon(p: Punkt, poly: Polygon): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!, b = poly[i]!;
    if ((b[1] > p[1]) !== (a[1] > p[1]) && p[0] < ((a[0] - b[0]) * (p[1] - b[1])) / (a[1] - b[1]) + b[0]) drin = !drin;
  }
  return drin;
}

/** Kürzester Abstand eines Punktes zu einer Strecke. */
export function abstandPunktStrecke(p: Punkt, a: Punkt, b: Punkt): number {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const laengeQuadrat = vx * vx + vy * vy;
  const t = laengeQuadrat < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / laengeQuadrat));
  const dx = a[0] + vx * t - p[0], dy = a[1] + vy * t - p[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Kürzester Abstand eines Polygons zu einer Strecke — 0, wenn die Strecke es schneidet. */
export function abstandPolygonStrecke(poly: Polygon, a: Punkt, b: Punkt): number {
  let kleinster = Infinity;
  for (const p of poly) kleinster = Math.min(kleinster, abstandPunktStrecke(p, a, b));
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    kleinster = Math.min(kleinster, abstandPunktStrecke(a, poly[j]!, poly[i]!), abstandPunktStrecke(b, poly[j]!, poly[i]!));
  }
  return kleinster;
}

/**
 * Ein konvexes Polygon rekursiv in Parzellen schneiden, bis jede höchstens `zielFlaeche` misst.
 *
 * Geschnitten wird quer zur längeren Achse des umschliessenden Rechtecks, durch einen Punkt
 * nahe dem Schwerpunkt, mit leicht gekippter Schnittrichtung. Die Kippung ist der ganze
 * Unterschied zwischen „Blockraster" und „gewachsen": ohne sie stehen alle Trennwände parallel.
 *
 * **Nicht** garantiert: dass jedes Blatt den ursprünglichen Rand berührt. Ein Blatt kann ringsum
 * von Schnittkanten begrenzt sein und damit mitten im Block liegen — der Aufrufer muss solche
 * Lose selbst erkennen (`erzeugeSiedlung` misst dafür den Abstand zur nächsten Gasse).
 */
export function teileInParzellen(
  poly: Polygon,
  zielFlaeche: number,
  r: { zahl: (min: number, max: number) => number },
  tiefeMax = 7,
): Polygon[] {
  if (poly.length < 3) return [];
  if (tiefeMax <= 0 || flaeche(poly) <= zielFlaeche) return [poly];
  const [x0, y0, x1, y1] = huelle(poly);
  const laengs = x1 - x0 >= y1 - y0;
  // Schnittnormale quer zur längeren Achse, um bis zu ~17 Grad gekippt — ohne Winkelfunktion.
  const kippung = r.zahl(-0.3, 0.3);
  const rohNx = laengs ? 1 : kippung, rohNy = laengs ? kippung : 1;
  const laenge = Math.sqrt(rohNx * rohNx + rohNy * rohNy);
  const nx = rohNx / laenge, ny = rohNy / laenge;
  const s = schwerpunkt(poly);
  // Der Schnitt geht nicht exakt durch die Mitte: gleich grosse Parzellen lesen als Zeile.
  const versatz = r.zahl(-0.16, 0.16) * (laengs ? x1 - x0 : y1 - y0);
  const c = nx * s[0] + ny * s[1] + versatz;
  const a = clipHalbebene(poly, nx, ny, c);
  const b = clipHalbebene(poly, -nx, -ny, -c);
  if (a.length < 3 || b.length < 3) return [poly];
  return [...teileInParzellen(a, zielFlaeche, r, tiefeMax - 1), ...teileInParzellen(b, zielFlaeche, r, tiefeMax - 1)];
}

/**
 * Die Randkanten einer Menge benachbarter Polygone — die Stadtmauer, als Segmentmenge.
 *
 * Eine Kante, die genau **einer** gewählten Zelle gehört, liegt aussen; eine, die zwei teilen,
 * ist eine Gasse im Inneren. Verglichen wird über den **Kantenmittelpunkt** auf Hundertstel:
 * beide Nachbarn schneiden dieselbe Bisektrice, aber in anderer Reihenfolge, und die Endpunkte
 * können im letzten Bit abweichen — der Mittelpunkt ist der stabilere Schlüssel.
 *
 * Bewusst **kein** verketteter Ring. Eine erste Fassung verkettete die offenen Kanten zu Ringen
 * und zog dabei an jeder Y-Verzweigung eine Mauer quer durch die Stadt: bei drei Kanten an einem
 * Punkt ist „der nächste Nachbar" nicht definiert. Eine Mauer aus Segmenten braucht diese
 * Entscheidung nie, und das Kartenformat will ohnehin Segmente (`walls[].points`, min. 2).
 */
export function aussenkanten(zellen: readonly Polygon[]): { von: Punkt; bis: Punkt }[] {
  const zaehler = new Map<string, { von: Punkt; bis: Punkt; n: number }>();
  for (const zelle of zellen) {
    for (let i = 0, j = zelle.length - 1; i < zelle.length; j = i++) {
      const a = zelle[j]!, b = zelle[i]!;
      const key = `${Math.round(((a[0] + b[0]) / 2) * 100)}:${Math.round(((a[1] + b[1]) / 2) * 100)}`;
      const vorhanden = zaehler.get(key);
      if (vorhanden) vorhanden.n++;
      else zaehler.set(key, { von: a, bis: b, n: 1 });
    }
  }
  return [...zaehler.values()].filter((k) => k.n === 1)
    .sort((x, y) => x.von[1] - y.von[1] || x.von[0] - y.von[0])
    .map(({ von, bis }) => ({ von, bis }));
}

/** @deprecated Verkettet Randkanten zu Ringen; an Y-Verzweigungen nicht wohldefiniert. */
function aussenringUnbenutzt(zellen: readonly Polygon[]): Punkt[][] {
  const schluessel = (a: Punkt, b: Punkt) => `${q(a[0])}:${q(a[1])}|${q(b[0])}:${q(b[1])}`;
  const zaehler = new Map<string, { a: Punkt; b: Punkt; n: number }>();
  for (const zelle of zellen) {
    for (let i = 0, j = zelle.length - 1; i < zelle.length; j = i++) {
      const a = zelle[j]!, b = zelle[i]!;
      // Kanonische Richtung, damit dieselbe Kante aus beiden Nachbarn denselben Schlüssel hat.
      const vor = q(a[0]) < q(b[0]) || (q(a[0]) === q(b[0]) && q(a[1]) <= q(b[1]));
      const key = vor ? schluessel(a, b) : schluessel(b, a);
      const vorhanden = zaehler.get(key);
      if (vorhanden) vorhanden.n++;
      else zaehler.set(key, { a: vor ? a : b, b: vor ? b : a, n: 1 });
    }
  }
  const offen = [...zaehler.values()].filter((k) => k.n === 1);
  const vonPunkt = new Map<string, Punkt[]>();
  for (const kante of offen) {
    const k = `${q(kante.a[0])}:${q(kante.a[1])}`;
    if (!vonPunkt.has(k)) vonPunkt.set(k, []);
    vonPunkt.get(k)!.push(kante.b);
    const k2 = `${q(kante.b[0])}:${q(kante.b[1])}`;
    if (!vonPunkt.has(k2)) vonPunkt.set(k2, []);
    vonPunkt.get(k2)!.push(kante.a);
  }
  const besucht = new Set<string>();
  const ringe: Punkt[][] = [];
  for (const kante of offen) {
    const start = `${q(kante.a[0])}:${q(kante.a[1])}`;
    if (besucht.has(start)) continue;
    const ring: Punkt[] = [];
    let aktuell: Punkt = kante.a, vorher: string | null = null;
    for (let schritt = 0; schritt < offen.length + 2; schritt++) {
      const k = `${q(aktuell[0])}:${q(aktuell[1])}`;
      if (besucht.has(k) && ring.length) break;
      besucht.add(k);
      ring.push(aktuell);
      const nachbarn = vonPunkt.get(k) ?? [];
      const naechster = nachbarn.find((p) => `${q(p[0])}:${q(p[1])}` !== vorher);
      if (!naechster) break;
      vorher = k;
      aktuell = naechster;
    }
    if (ring.length >= 3) ringe.push(ring);
  }
  return ringe;
}
