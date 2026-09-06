#!/usr/bin/env node
// Gate K-G8 / G-FG1 — "Die Grenze".
//
// `packages/forge` may never import `packages/chronik`. The Forge authors geometry;
// the campaign authors who may see it. If those blur, the Forge can no longer ship as a
// standalone binary and RB-11's separability ruling is dead.
//   design/research/RB-20b-machbarkeit.md:527  ·  design/06-giga-product-architecture.md:2886
//   design/iterations/OPEN-DECISIONS.md:101 (M8)
// "Cheap now, impossible to repair later." — RB-20:452
//
// The rule set is a DENY-list of (from, to) package pairs, written as a deny-list on
// purpose: round 3's structural lesson was that three gates written as allow-lists from
// memory all failed (design/iterations/README.md:56).

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = join(ROOT, "packages");

/** @type {{from: string, to: string, gate: string, why: string}[]} */
const FORBIDDEN = [
  {
    from: "forge",
    to: "chronik",
    gate: "K-G8 · Die Grenze",
    why: "the Forge must stay separately shippable; it may never learn who may see what",
  },
  {
    from: "szene",
    to: "chronik",
    gate: "06:2880",
    why: "szene must not duplicate knowledge decisions",
  },
  {
    from: "core",
    to: "chronik",
    gate: "layering",
    why: "core is the shared spine and may depend on nothing",
  },
  { from: "core", to: "szene", gate: "layering", why: "core may depend on nothing" },
  { from: "core", to: "projection", gate: "layering", why: "core may depend on nothing" },
  { from: "core", to: "forge", gate: "layering", why: "core may depend on nothing" },
  { from: "core", to: "io", gate: "layering", why: "core may depend on nothing" },
  { from: "core", to: "server", gate: "layering", why: "core may depend on nothing" },
];

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g;
const DYNAMIC_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(e.name)) yield p;
  }
}

/** Which workspace package does an absolute path belong to? */
function owningPackage(absPath) {
  const rel = relative(PACKAGES, absPath);
  if (rel.startsWith("..")) return null;
  const first = rel.split(sep)[0];
  return first || null;
}

/** Which workspace package does an import specifier point at? */
function targetPackage(spec) {
  const m = /^@chronicle\/([a-z0-9-]+)/.exec(spec);
  return m ? m[1] : null;
}

async function main() {
  try {
    await stat(PACKAGES);
  } catch {
    console.error(`gate:boundaries — no packages/ directory at ${PACKAGES}`);
    process.exit(2);
  }

  /** @type {{file: string, from: string, to: string, spec: string, gate: string, why: string}[]} */
  const violations = [];
  let scanned = 0;

  for await (const file of walk(PACKAGES)) {
    const from = owningPackage(file);
    if (!from) continue;
    scanned++;
    const src = await readFile(file, "utf8");
    const specs = new Set();
    for (const re of [IMPORT_RE, DYNAMIC_RE, REQUIRE_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) specs.add(m[1]);
    }
    for (const spec of specs) {
      const to = targetPackage(spec);
      if (!to || to === from) continue;
      const rule = FORBIDDEN.find((r) => r.from === from && r.to === to);
      if (rule) {
        violations.push({ file: relative(ROOT, file), from, to, spec, gate: rule.gate, why: rule.why });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\nGATE RED — forbidden cross-package imports (${violations.length}):\n`);
    for (const v of violations) {
      console.error(`  ${v.file}`);
      console.error(`    packages/${v.from} -> packages/${v.to}   via "${v.spec}"`);
      console.error(`    gate ${v.gate}: ${v.why}\n`);
    }
    process.exit(1);
  }

  console.log(`gate:boundaries GREEN — ${scanned} files scanned, ${FORBIDDEN.length} rules, 0 violations`);
}

await main();
