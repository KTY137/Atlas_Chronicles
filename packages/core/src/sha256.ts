// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * SHA-256, in portable TypeScript, because the hash must exist in both runtimes.
 *
 * This is not a preference for purity. Gate `G-RL1 · Nachgerechnet` requires byte-identical
 * replay **on Windows, macOS and Linux, in Chromium *and* Node** — and every derived id in this
 * product is a hash (`deriveId`, `Weltkeim.keimHash`, passage digests, bundle integrity). A hash
 * that only exists on the server makes that gate unmeetable in a browser by construction, and
 * `node:crypto` in `packages/core` reaches the client the moment anything imports `@chronicle/szene`
 * or `@chronicle/forge` — which the tactical views already do. Vite then resolves it to
 * `__vite-browser-external`, whose `createHash` is not a function: either the build fails or, worse,
 * it succeeds and throws when a user finally walks that path.
 *
 * `crypto.subtle.digest` is the browser's native answer and is deliberately NOT used: it is
 * asynchronous, and making id derivation async would turn a pure function into a promise at every
 * one of its call sites, including inside generators that must stay deterministic and synchronous.
 *
 * A second implementation would be the parallel path §5 forbids, so there is exactly one, and
 * `sha256.test.ts` pins it against `node:crypto` over known vectors and random inputs. `node:crypto`
 * is the oracle in the test; it is not in the product.
 *
 * Correctness rests on FIPS 180-4. The bit length is written as a 64-bit big-endian value, and
 * inputs above 2^53 bits are refused rather than silently truncated — a wrong digest on a huge
 * input would be far worse than a refusal, because nothing downstream could detect it.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0;

const HEX = "0123456789abcdef";

/** Shared across calls: this runs on every derived id, so a per-call allocation is not free. */
const w = new Uint32Array(64);

export function sha256Bytes(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8;
  if (!Number.isSafeInteger(bitLength)) {
    throw new RangeError("sha256: input too large to length-encode exactly");
  }
  const total = ((input.length + 9 + 63) >> 6) << 6;
  const buffer = new Uint8Array(total);
  buffer.set(input);
  buffer[input.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(total - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(total - 4, bitLength >>> 0);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15]!, y = w[i - 2]!;
      const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
      const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (const [i, value] of [h0, h1, h2, h3, h4, h5, h6, h7].entries()) outView.setUint32(i * 4, value);
  return out;
}

/** Lowercase hex, the only digest form this product stores or compares. */
export function sha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = sha256Bytes(bytes);
  let hex = "";
  for (const byte of digest) hex += HEX[byte >> 4]! + HEX[byte & 15]!;
  return hex;
}
