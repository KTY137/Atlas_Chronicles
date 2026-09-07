// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join as joinPath, resolve as resolvePath, sep } from "node:path";
import { parseAssetpaket, ASSETPAKET_LIMITS, type AssetpaketV1, type PaketAsset } from "@chronicle/szene";
import { Gone } from "./errors.ts";

/**
 * Serving `Weltkeim`-referenced artwork, and nothing an attacker asks for by name.
 *
 * `assetpaket.ts` built the manifest format and refused, on principle, to resolve one to bytes
 * (`assetpaket.ts:24-26`: "browser-pure — no Node, no filesystem, no network"). This module is that
 * missing half: it maps `Stamp.a` references to authorized bytes for a map renderer that needs to
 * paint placements, and it is the one place in the product allowed to open a file inside
 * `assets/packs/`.
 *
 * The design constraint that shapes everything below: **a filesystem path is never built from a
 * request.** `resolveAsset` takes the attacker-controlled wildcard segment and does exactly one
 * thing with it — an `===` comparison against the `datei` values the manifest already declared.
 * Those values were validated at parse time (`assetpaket.ts:131-140`, `relativePath`) to contain no
 * `..` segment and no absolute prefix. A request for anything else is not "invalid input to clean
 * up"; per the brief, it does not exist, full stop, and no `fs` call happens on that path at all.
 *
 * The second half of the job is refusing to serve a lie. `Stamp.a` resolves through the manifest's
 * `sha256` (`assetpaket.ts:66`), and `erzeugeGrundriss` hashes the very same manifest into its
 * `Weltkeim` (`grundriss.ts:113`, RB-21d). If the bytes on disk ever drift from what the manifest
 * declares — a bad deploy, a manual edit, a corrupted checkout — serving them anyway would silently
 * break reproducibility for every map that references the asset. `readAsset` re-hashes on every
 * read and refuses on mismatch instead.
 */

/** A pack file exists per the manifest but disagrees with it: refused, never served as-is. */
export class PackIntegrityError extends Error {
  override readonly name = "PackIntegrityError";
}

/** Default install root: the repo's `assets/packs/`, resolved the same way `grundriss.ts` resolves its one pack. */
const DEFAULT_ROOT = fileURLToPath(new URL("../../../../assets/packs/", import.meta.url));

interface InstalledPack {
  readonly paket: AssetpaketV1;
  readonly dir: string;
}

export interface PackSummary {
  readonly id: string;
  readonly version: string;
  readonly assetCount: number;
  readonly lizenz: { readonly spdx: string; readonly inhaber: string };
}

export interface CreatePacksOptions {
  /** Overrides the scan root. Production always serves the real `assets/packs/`; tests point this
   *  at a throwaway fixture directory so a tampered or undeclared file never has to touch the
   *  repository's actual asset pack. */
  readonly root?: string;
}

export function createPacks(options: CreatePacksOptions = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  // Scoped to this closure, not module state: every `createPacks()` call (one per test fixture, one
  // for the real server) gets its own cache, so fixtures never bleed into each other or into the
  // real pack the running process also serves.
  let cache: ReadonlyMap<string, InstalledPack> | null = null;

  function installed(): ReadonlyMap<string, InstalledPack> {
    if (cache) return cache;
    const packs = new Map<string, InstalledPack>();
    let entries: import("node:fs").Dirent[];
    try { entries = readdirSync(root, { withFileTypes: true }); }
    catch { cache = packs; return packs; } // No packs directory at all: an empty catalogue, not a crash.
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = joinPath(root, entry.name);
      let raw: string;
      try { raw = readFileSync(joinPath(dir, "paket.json"), "utf8"); }
      catch { continue; } // A directory without a manifest is not a pack; siblings are unaffected.
      // A directory that DOES carry a manifest but fails to parse is a real configuration fault —
      // an operator shipped a broken pack — and is not swallowed: every route this feeds refuses
      // loudly rather than quietly serving a partial or wrong catalogue.
      const paket = parseAssetpaket(raw);
      packs.set(paket.id, { paket, dir });
    }
    cache = packs;
    return packs;
  }

  function pack(packId: string): InstalledPack {
    const found = installed().get(packId);
    if (!found) throw new Gone("pack-unknown");
    return found;
  }

  /** `id`, `version`, asset count and licence — enough to render a picker, nothing more. */
  function list(): readonly PackSummary[] {
    return [...installed().values()]
      .map(({ paket }): PackSummary => ({
        id: paket.id, version: paket.version, assetCount: paket.assets.length,
        lizenz: { spdx: paket.lizenz.spdx, inhaber: paket.lizenz.inhaber },
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  function manifest(packId: string): AssetpaketV1 {
    return pack(packId).paket;
  }

  /**
   * THE SECURITY BOUNDARY. `name` is the raw HTTP wildcard segment — attacker-controlled — and it
   * is never interpolated into a path. It is only ever compared, by exact string equality, against
   * `datei` values already present in the parsed, validated manifest. A value that is not in that
   * whitelist throws before a single `fs` call happens: there is no path to sanitise because no
   * path is ever built from `name`.
   */
  function resolveAsset(packId: string, name: string): { paket: AssetpaketV1; asset: PaketAsset; dir: string } {
    const found = pack(packId);
    const asset = found.paket.assets.find((candidate) => candidate.datei === name);
    if (!asset) throw new Gone("asset-unknown");
    return { paket: found.paket, asset, dir: found.dir };
  }

  /**
   * Read and verify one asset's bytes. Two checks live only here, never at the HTTP layer, so no
   * future route can be added that accidentally skips them:
   *
   *  - The resolved absolute path must stay inside the pack directory. `resolveAsset` already makes
   *    an escape impossible by construction (the path component comes from the manifest, never from
   *    the request) — this is the belt on top of those suspenders: a future refactor that weakens
   *    the lookup fails loudly here instead of quietly widening what gets served.
   *  - The bytes on disk must stat to the manifest's declared size and hash to its `sha256`. Checked
   *    in that order on purpose: `stat` is cheap and catches a swapped-in oversized file *before*
   *    it is ever read into memory — the bounded-response requirement — while the hash is the
   *    actual proof of identity. The manifest is what the generator hashed into its `Weltkeim`;
   *    serving different bytes under the same name would silently break reproducibility for every
   *    map that already references this asset, which is worse than an honest refusal today.
   */
  function readAsset(packId: string, name: string): { mimeType: PaketAsset["mimeType"]; sha256: string; bytes: Buffer } {
    const { asset, dir } = resolveAsset(packId, name);
    const packDir = resolvePath(dir) + sep;
    const absolute = resolvePath(dir, asset.datei);
    if (!absolute.startsWith(packDir)) throw new PackIntegrityError(`Asset "${name}" verlässt das Paketverzeichnis; Auslieferung verweigert.`);

    let size: number;
    try { size = statSync(absolute).size; }
    catch { throw new PackIntegrityError(`Asset "${name}" ist im Manifest verzeichnet, aber auf der Platte nicht auffindbar.`); }
    // Bounded response: refuse an absurd or merely mismatched file before opening it, rather than
    // streaming an arbitrary number of bytes into memory on the strength of a manifest promise.
    if (size > ASSETPAKET_LIMITS.assetBytes || size !== asset.bytes) {
      throw new PackIntegrityError(`Asset "${name}" hat auf der Platte eine andere Größe als im Manifest verzeichnet; Auslieferung verweigert.`);
    }

    const bytes = readFileSync(absolute);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== asset.sha256) {
      throw new PackIntegrityError(`Asset "${name}" entspricht nicht dem im Manifest verzeichneten SHA-256; Auslieferung verweigert.`);
    }
    // Only the manifest's declared type is ever returned — never a guess from the file extension.
    return { mimeType: asset.mimeType, sha256: asset.sha256, bytes };
  }

  return { list, manifest, resolveAsset, readAsset };
}
