/**
 * Prueft eine Preset-Palette gegen dieselben Paare wie packages/theme/src/contrast.ts.
 * Wegwerf-Werkzeug fuer den Entwurf von Aurora: sagt, welche Paarung fehlt und um wie viel.
 */
const lum = (hex) => {
  const ch = (o) => {
    const v = parseInt(hex.slice(o, o + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

const surfaces = ["bg", "bg-deep", "surface", "surface-2", "surface-hover", "input-bg"];
const reading = [...surfaces, "accent-soft", "ok-soft", "danger-soft", "warning-soft", "info-soft", "private-soft"];

export function evaluate(colors) {
  const pairs = [];
  const add = (fg, bg, min) => pairs.push({ id: `${fg}/${bg}`, fg, bg, min });
  for (const fg of ["text", "text-muted", "text-faint", "link", "link-visited", "accent"]) {
    for (const bg of reading) add(fg, bg, 4.5);
  }
  for (const fg of ["ok", "danger", "warning", "info", "private"]) {
    for (const bg of [...surfaces, `${fg}-soft`]) add(fg, bg, 4.5);
  }
  for (const bg of reading) {
    add("control-line", bg, 3);
    add("focus", bg, 3);
  }
  add("accent-ink", "accent", 4.5);
  add("accent-ink", "accent-strong", 4.5);
  add("selection-ink", "selection", 4.5);
  add("disabled", "disabled-bg", 4.5);

  const failures = [];
  for (const p of pairs) {
    const fg = colors[p.fg];
    const bg = colors[p.bg];
    if (!fg || !bg) {
      failures.push(`${p.id}: Token fehlt`);
      continue;
    }
    const r = ratio(fg, bg);
    if (r < p.min) failures.push(`${p.id}  ${r} < ${p.min}   (${fg} auf ${bg})`);
  }
  return { total: pairs.length, failures };
}

if (process.argv[1]?.endsWith("aurora-contrast.mjs")) {
  const { AURORA } = await import("./aurora-palette.mjs");
  const { total, failures } = evaluate(AURORA);
  console.log(`${total - failures.length}/${total} Paare bestehen`);
  for (const f of failures) console.log("  FAIL", f);
  process.exitCode = failures.length ? 1 : 0;
}
