// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareDesktopBuildOutput } from "../../packages/desktop/tools/build-output.mjs";

const workspace = fileURLToPath(new URL("../../", import.meta.url));
const inside = (parent, child) => {
  const suffix = relative(parent, child);
  return suffix && !isAbsolute(suffix) && !suffix.split(sep).includes("..");
};

async function fixture(t) {
  const base = join(workspace, ".local", "desktop-build-output-tests");
  await mkdir(base, { recursive: true });
  const root = await realpath(base);
  assert.ok(inside(await realpath(workspace), root));
  const directory = await mkdtemp(join(root, "case-"));
  t.after(async () => {
    const target = await realpath(directory);
    assert.ok(inside(root, target) && dirname(target) === root && relative(root, target).startsWith("case-"));
    await rm(target, { recursive: true, force: true });
  });
  const desktop = join(directory, "desktop");
  await mkdir(desktop);
  await writeFile(join(desktop, "source-sentinel.ts"), "keep source");
  return { directory, desktop };
}

test("a removed migration cannot survive into the next desktop build", async t => {
  const { directory, desktop } = await fixture(t);
  const source = join(directory, "current-migrations"), previous = join(desktop, "dist", "migrations");
  await mkdir(source);
  await writeFile(join(source, "036_tabletop.sql"), "current schema");
  await mkdir(previous, { recursive: true });
  await writeFile(join(previous, "037_actor_progression.sql"), "removed schema extension");
  // Reproduce the original overlay-copy defect with the actual filesystem operation.
  await cp(source, previous, { recursive: true });
  assert.deepEqual((await readdir(previous)).sort(), ["036_tabletop.sql", "037_actor_progression.sql"]);
  const output = await prepareDesktopBuildOutput(desktop);
  await cp(source, join(output, "migrations"), { recursive: true });
  assert.deepEqual(await readdir(join(output, "migrations")), ["036_tabletop.sql"]);
  assert.equal(await readFile(join(desktop, "source-sentinel.ts"), "utf8"), "keep source");
});

test("removed manager, runtime, client, pack and fixture files are excluded together", async t => {
  const { desktop } = await fixture(t);
  for (const name of ["manager", "runtime", "client", "assets/packs/removed-pack", "fixtures"]) {
    const target = join(desktop, "dist", name);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "obsolete.txt"), "old build only");
  }
  const output = await prepareDesktopBuildOutput(desktop);
  assert.deepEqual(await readdir(output), []);
  assert.equal(await readFile(join(desktop, "source-sentinel.ts"), "utf8"), "keep source");
});

test("a first build creates its own empty output", async t => {
  const { desktop } = await fixture(t);
  const output = await prepareDesktopBuildOutput(desktop);
  assert.equal(output, join(await realpath(desktop), "dist"));
  assert.deepEqual(await readdir(output), []);
});

test("a junction or non-directory output is refused without touching its destination", async t => {
  const { directory, desktop } = await fixture(t);
  const external = join(directory, "unrelated");
  await mkdir(external);
  await writeFile(join(external, "sentinel"), "keep unrelated bytes");
  const output = join(desktop, "dist");
  await symlink(external, output, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(prepareDesktopBuildOutput(desktop), /ordinary directory/);
  assert.equal(await readFile(join(external, "sentinel"), "utf8"), "keep unrelated bytes");
  await rm(output);
  await writeFile(output, "not a build directory");
  await assert.rejects(prepareDesktopBuildOutput(desktop), /ordinary directory/);
  assert.equal(await readFile(output, "utf8"), "not a build directory");
});

test("a linked desktop package is refused without deleting another package's output", async t => {
  const { directory, desktop } = await fixture(t);
  await mkdir(join(desktop, "dist"));
  await writeFile(join(desktop, "dist", "sentinel"), "keep original build");
  const linked = join(directory, "linked-desktop");
  await symlink(desktop, linked, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(prepareDesktopBuildOutput(linked), /ancestors.*without links/);
  assert.equal(await readFile(join(desktop, "dist", "sentinel"), "utf8"), "keep original build");
});

test("a linked ancestor is refused even when desktop and dist themselves are ordinary directories", async t => {
  const { directory } = await fixture(t);
  const realParent = join(directory, "real-parent"), realDesktop = join(realParent, "desktop");
  await mkdir(join(realDesktop, "dist"), { recursive: true });
  await writeFile(join(realDesktop, "dist", "sentinel"), "keep ancestor target");
  const linkedParent = join(directory, "linked-parent");
  await symlink(realParent, linkedParent, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(prepareDesktopBuildOutput(join(linkedParent, "desktop")), /ancestors.*without links/);
  assert.equal(await readFile(join(realDesktop, "dist", "sentinel"), "utf8"), "keep ancestor target");
});
