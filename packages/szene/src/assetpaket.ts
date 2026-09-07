// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseBoundedMapJson } from "./tactical-map.ts";
import type { SceneDoc } from "./model.ts";

/**
 * THE IRREVERSIBLE LAYER — the referent of `Stamp.a`.
 *
 * `SceneDoc` has always demanded a **pack-qualified** asset reference and explicitly forbidden a
 * URL (`model.ts:220`, enforced in `tactical-map.ts` by `^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$`).
 * Nothing in the repository could resolve one. A reference format without a referent format is
 * half a contract, and the missing half is the half that carries the licence.
 *
 * Two findings decide the shape of this record and neither is negotiable later:
 *
 *  1. **RB-21c / RB-04 — provenance is not metadata, it is the shippability of the product.**
 *     Shipping the generator's `dist/` was refused because 21.49 MB of `public/` carries 179
 *     CC-BY-NC-SA charges and a GPLv2+ editor (`model.ts:193-195`). A pack that cannot name, per
 *     asset, *which* licence text was in force is exactly that risk with a friendlier filename.
 *  2. **RB-21d:596 — `spdx_id: NOASSERTION`.** Azgaar's licence is MIT *plus an inserted grant*, so
 *     an SPDX identifier alone is a lie in both directions: it either false-positives as MIT or is
 *     rejected outright. The corpus's ruling is a `LicenseRef-*` **with a `license_text_snapshot`**.
 *     Hence `Lizenz.textSha256` is required, always, including for our own work. An identifier is a
 *     claim; a hashed text is evidence.
 *
 * Deliberately **not** here: pixels, decoding, URLs, delivery, and any authorization decision.
 * A manifest names content addresses; a server maps them to authorized bytes. This module is
 * browser-pure — no Node, no filesystem, no network — because `packages/szene` is (`index.ts:4`).
 */

export const ASSETPAKET_VERSION = 1 as const;
export const ASSETPAKET_LIMITS = Object.freeze({
  manifestBytes: 4 * 1024 * 1024, assets: 4096, assetBytes: 32 * 1024 * 1024,
  name: 64, pfad: 256, text: 512, schlagworte: 24, zellgroesse: 4096, dimension: 32768, einheiten: 512,
});

/** The mime types a pack may declare. Vector first: a floorplan asset has no native resolution. */
export const ASSET_MIME_TYPES = ["image/svg+xml", "image/png", "image/webp"] as const;
export type AssetMimeType = (typeof ASSET_MIME_TYPES)[number];

/**
 * Closed on purpose. A new kind is a deliberate schema act, the same discipline `IdKind` applies
 * to identity — a catalogue whose categories are free text cannot be gated, only grepped.
 */
export const ASSET_ARTEN = ["boden", "wand", "tuer", "aufbau", "moebel", "gefaess", "licht", "marke", "figur"] as const;
export type AssetArt = (typeof ASSET_ARTEN)[number];

export interface Lizenz {
  /** SPDX identifier, or `LicenseRef-*` when the text is not a verbatim standard licence. */
  readonly spdx: string;
  readonly inhaber: string;
  /** `eigen` = authored in this repository. `extern` requires a resolvable `quelle`. */
  readonly herkunft: "eigen" | "extern";
  readonly quelle: string | null;
  /** Pack-relative path of the licence text that is actually shipped beside the bytes. */
  readonly datei: string;
  /** sha256 of that text. RB-21d:596 — the snapshot, not the identifier, is the evidence. */
  readonly textSha256: string;
}

export interface PaketAsset {
  /** Second half of `Stamp.a`. Flat by contract: `Stamp.a` permits exactly one slash. */
  readonly name: string;
  readonly art: AssetArt;
  /** Pack-relative file path. May nest; may never escape the pack. */
  readonly datei: string;
  readonly mimeType: AssetMimeType;
  readonly sha256: string;
  readonly bytes: number;
  /** Intrinsic size in the pack's authoring pixels. */
  readonly groesse: readonly [number, number];
  /** The intrinsic pixel that lands on the stamp's `x`/`y`. Never assumed to be the centre. */
  readonly anker: readonly [number, number];
  /** Footprint in grid cells — what a placement algorithm reserves, not what a renderer draws. */
  readonly einheiten: readonly [number, number];
  readonly kachelbar: boolean;
  readonly schlagworte: readonly string[];
  /** `null` inherits the pack licence. An override is per asset, never per directory. */
  readonly lizenz: Lizenz | null;
}

export interface AssetpaketV1 {
  readonly schemaVersion: 1;
  readonly kind: "asset-pack";
  /** First half of `Stamp.a`, and the directory name under `assets/packs/`. */
  readonly id: string;
  readonly titel: string;
  readonly version: string;
  readonly urheber: string;
  /**
   * The grid pitch the intrinsic sizes were authored at. Without it `einheiten` and `groesse` are
   * two unrelated numbers and every consumer invents its own scale factor.
   */
  readonly zellgroesse: number;
  readonly lizenz: Lizenz;
  readonly assets: readonly PaketAsset[];
}

export class AssetpaketValidationError extends Error {
  override readonly name = "AssetpaketValidationError";
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); }
}
function fail(path: string, message: string): never { throw new AssetpaketValidationError(path, message); }

function object(value: unknown, path: string, required: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "object required");
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) if (!required.includes(key)) fail(`${path}.${key}`, "unknown property; an explicit schema migration is required");
  for (const key of required) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, "required property missing");
  return row;
}
function text(value: unknown, path: string, max: number = ASSETPAKET_LIMITS.text): string {
  if (typeof value !== "string" || !value.length || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(path, `bounded nonempty text of at most ${max} characters required`);
  return value as string;
}
function integer(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail(path, `integer in ${min}..${max} required`);
  return value as number;
}
function boolean(value: unknown, path: string): boolean { if (typeof value !== "boolean") fail(path, "boolean required"); return value as boolean; }
function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (typeof value !== "string" || !(choices as readonly string[]).includes(value)) fail(path, `expected ${choices.join(" | ")}`);
  return value as T;
}
function sha256(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail(path, "lowercase hexadecimal SHA-256 required");
  return value as string;
}
function pair(value: unknown, path: string, min: number, max: number): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) fail(path, "pair required");
  return [integer(value[0], `${path}[0]`, min, max), integer(value[1], `${path}[1]`, min, max)];
}
/** `[a-z0-9_.-]` segments only, and `..` is rejected as a segment, not merely searched for. */
const SEGMENT = /^[a-z0-9][a-z0-9_.-]*$/;
function relativePath(value: unknown, path: string): string {
  const raw = text(value, path, ASSETPAKET_LIMITS.pfad);
  const segments = raw.split("/");
  if (!segments.length || segments.some((segment) => segment === ".." || segment === "." || !SEGMENT.test(segment))) {
    fail(path, "pack-relative lowercase path without traversal required");
  }
  return raw;
}
function bezeichner(value: unknown, path: string): string {
  const raw = text(value, path, ASSETPAKET_LIMITS.name);
  // Narrower than `Stamp.a` accepts on purpose: the reference format is permissive so that a
  // foreign pack can be read, the authoring format is strict so that ours stay greppable.
  if (!SEGMENT.test(raw)) fail(path, "lowercase identifier matching [a-z0-9][a-z0-9_.-]* required");
  return raw;
}
function lizenz(value: unknown, path: string): Lizenz {
  const row = object(value, path, ["spdx", "inhaber", "herkunft", "quelle", "datei", "textSha256"]);
  const spdx = text(row.spdx, `${path}.spdx`, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(spdx)) fail(`${path}.spdx`, "SPDX identifier or LicenseRef-* required");
  const herkunft = choice(row.herkunft, ["eigen", "extern"] as const, `${path}.herkunft`);
  if (row.quelle !== null) {
    const quelle = text(row.quelle, `${path}.quelle`, 2048);
    try {
      const url = new URL(quelle);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) fail(`${path}.quelle`, "HTTP(S) attribution URL without credentials required");
    } catch { fail(`${path}.quelle`, "valid attribution URL required"); }
  } else if (herkunft === "extern") {
    // The whole point of the record: a third-party asset whose origin nobody wrote down is
    // indistinguishable from an asset nobody may ship.
    fail(`${path}.quelle`, "external provenance requires a named source");
  }
  return {
    spdx, inhaber: text(row.inhaber, `${path}.inhaber`, 256), herkunft, quelle: row.quelle === null ? null : (row.quelle as string),
    datei: relativePath(row.datei, `${path}.datei`), textSha256: sha256(row.textSha256, `${path}.textSha256`),
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}

export function parseAssetpaket(input: string | unknown): AssetpaketV1 {
  const raw = parseBoundedMapJson(input, ASSETPAKET_LIMITS.manifestBytes);
  const root = object(raw, "paket", ["schemaVersion", "kind", "id", "titel", "version", "urheber", "zellgroesse", "lizenz", "assets"]);
  if (root.schemaVersion !== ASSETPAKET_VERSION || root.kind !== "asset-pack") fail("paket", "unsupported asset pack profile; explicit migration required");
  const id = bezeichner(root.id, "paket.id");
  const version = text(root.version, "paket.version", 32);
  if (!/^\d+\.\d+\.\d+$/.test(version)) fail("paket.version", "three-part numeric version required");
  const paketLizenz = lizenz(root.lizenz, "paket.lizenz");
  if (!Array.isArray(root.assets) || root.assets.length > ASSETPAKET_LIMITS.assets) fail("paket.assets", `array with at most ${ASSETPAKET_LIMITS.assets} members required`);
  if (!root.assets.length) fail("paket.assets", "an empty pack is not a pack");

  const namen = new Set<string>(), dateien = new Set<string>([paketLizenz.datei]);
  const assets = root.assets.map((item, index): PaketAsset => {
    const path = `paket.assets[${index}]`;
    const row = object(item, path, ["name", "art", "datei", "mimeType", "sha256", "bytes", "groesse", "anker", "einheiten", "kachelbar", "schlagworte", "lizenz"]);
    const name = bezeichner(row.name, `${path}.name`);
    if (namen.has(name)) fail(`${path}.name`, "duplicate asset name");
    namen.add(name);
    const datei = relativePath(row.datei, `${path}.datei`);
    if (dateien.has(datei)) fail(`${path}.datei`, "duplicate file; one manifest row owns one file");
    dateien.add(datei);
    const groesse = pair(row.groesse, `${path}.groesse`, 1, ASSETPAKET_LIMITS.dimension);
    const anker = pair(row.anker, `${path}.anker`, -ASSETPAKET_LIMITS.dimension, ASSETPAKET_LIMITS.dimension);
    if (!Array.isArray(row.schlagworte) || row.schlagworte.length > ASSETPAKET_LIMITS.schlagworte) fail(`${path}.schlagworte`, `at most ${ASSETPAKET_LIMITS.schlagworte} tags required`);
    const schlagworte = row.schlagworte.map((tag, tagIndex) => bezeichner(tag, `${path}.schlagworte[${tagIndex}]`));
    if (new Set(schlagworte).size !== schlagworte.length) fail(`${path}.schlagworte`, "duplicate tag");
    return {
      name, art: choice(row.art, ASSET_ARTEN, `${path}.art`), datei, mimeType: choice(row.mimeType, ASSET_MIME_TYPES, `${path}.mimeType`),
      sha256: sha256(row.sha256, `${path}.sha256`), bytes: integer(row.bytes, `${path}.bytes`, 1, ASSETPAKET_LIMITS.assetBytes),
      groesse, anker, einheiten: pair(row.einheiten, `${path}.einheiten`, 1, ASSETPAKET_LIMITS.einheiten),
      kachelbar: boolean(row.kachelbar, `${path}.kachelbar`), schlagworte,
      lizenz: row.lizenz === null ? null : lizenz(row.lizenz, `${path}.lizenz`),
    };
  });
  return freeze({
    schemaVersion: ASSETPAKET_VERSION, kind: "asset-pack", id, titel: text(root.titel, "paket.titel", 256), version,
    urheber: text(root.urheber, "paket.urheber", 256), zellgroesse: integer(root.zellgroesse, "paket.zellgroesse", 1, ASSETPAKET_LIMITS.zellgroesse),
    lizenz: paketLizenz, assets,
  });
}

/** Key-sorted, so a manifest hash is a fact about content and not about authoring order. */
export function serializeAssetpaket(paket: AssetpaketV1): string {
  const validated = parseAssetpaket(paket);
  const sort = (value: unknown): unknown =>
    Array.isArray(value) ? value.map(sort)
      : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, child]) => [key, sort(child)]))
        : value;
  return JSON.stringify(sort(validated));
}

/** The one place `Stamp.a` is composed. Never build this string by hand at a call site. */
export function assetVerweis(paketId: string, name: string): string { return `${paketId}/${name}`; }

export interface AufgeloestesAsset {
  readonly paket: AssetpaketV1;
  readonly asset: PaketAsset;
  /** The effective licence after inheritance — resolved once, here, never at a display site. */
  readonly lizenz: Lizenz;
}

/** Index a set of packs by `Stamp.a`. Duplicate pack ids are an error, not a last-one-wins. */
export function assetIndex(pakete: readonly AssetpaketV1[]): ReadonlyMap<string, AufgeloestesAsset> {
  const index = new Map<string, AufgeloestesAsset>(), ids = new Set<string>();
  for (const paket of pakete) {
    if (ids.has(paket.id)) fail(`paket.${paket.id}`, "duplicate pack id in one index");
    ids.add(paket.id);
    for (const asset of paket.assets) index.set(assetVerweis(paket.id, asset.name), { paket, asset, lizenz: asset.lizenz ?? paket.lizenz });
  }
  return index;
}

export interface UnaufgeloesterVerweis { readonly stampId: string; readonly verweis: string }

/**
 * Every stamp reference a given pack set cannot resolve. Returned, never thrown: a scene that
 * references a pack the reader has not been granted is a *projection* problem, and this module is
 * forbidden from deciding who may see what (`index.ts:3`).
 */
export function pruefeStampVerweise(szene: SceneDoc, index: ReadonlyMap<string, AufgeloestesAsset>): readonly UnaufgeloesterVerweis[] {
  const fehlend: UnaufgeloesterVerweis[] = [];
  for (const stamp of szene.stamps) if (!index.has(stamp.a)) fehlend.push({ stampId: stamp.id, verweis: stamp.a });
  return fehlend;
}
