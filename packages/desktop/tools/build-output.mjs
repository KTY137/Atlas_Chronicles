// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { lstat, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/** dist is generated as a whole. Overlay copies otherwise retain deleted SQL,
 * assets, runtime and manager files from earlier builds in the next release. */
export async function prepareDesktopBuildOutput(desktop) {
  const expectedParent = resolve(desktop);
  // Checking only dist misses a junction in the package path or an ancestor:
  // realpath(desktop) would silently turn someone else's dist into our target.
  for (let current = expectedParent; ; current = dirname(current)) {
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error("Desktop package and its ancestors must be ordinary directories without links.");
    if (dirname(current) === current) break;
  }
  const parent = await realpath(expectedParent);
  if (parent !== expectedParent) throw new Error("Desktop package path must match its canonical location.");
  const output = resolve(parent, "dist");
  if (dirname(output) !== parent) throw new Error("Desktop build output must be the package's own dist directory.");
  const existing = await lstat(output).catch(error => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink() || await realpath(output) !== output))
    throw new Error("Desktop build output must be an ordinary directory inside the desktop package.");
  // The resolved absolute target was checked above; no caller-supplied subtree is deleted.
  await rm(output, { recursive: true, force: true });
  await mkdir(output);
  return output;
}
