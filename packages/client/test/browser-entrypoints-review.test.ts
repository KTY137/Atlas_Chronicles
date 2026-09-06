import { createHash } from "node:crypto";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build, type BuildOptions, type Plugin } from "esbuild";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const builtins = new Set(builtinModules.map(name => name.replace(/^node:/, "")));

/** Bundle workspace code in memory. Third-party UI dependencies are outside this
 * boundary check; Node builtins are rejected before externalizing dependencies.
 * No Vite cache, canonical dist, development server or browser runner is used. */
const browserBoundary: Plugin = {
  name: "review-browser-boundary",
  setup(builder) {
    builder.onResolve({ filter: /^[^./]/ }, args => {
      if (args.path.startsWith("node:") || builtins.has(args.path)) {
        return { errors: [{ text: `Node builtin ${args.path} reached from ${args.importer}` }] };
      }
      if (!args.path.startsWith("@chronicle/")) return { path: args.path, external: true };
      return undefined;
    });
  },
};

function browserBundle(options: BuildOptions) {
  return build({
    absWorkingDir: root, bundle: true, platform: "browser", format: "esm",
    treeShaking: true, write: false, metafile: true, logLevel: "silent",
    loader: { ".css": "empty" }, plugins: [browserBoundary], ...options,
  });
}

type BrowserHashes = Pick<typeof import("@chronicle/core"), "canonicalJson" | "canonicalHash" | "textHash" | "deriveId"> &
  Pick<typeof import("@chronicle/szene"), "weltkeim">;

async function hashesWithoutNode(): Promise<BrowserHashes> {
  const result = await browserBundle({
    stdin: {
      contents: 'export { canonicalJson, canonicalHash, textHash, deriveId } from "@chronicle/core"; export { weltkeim } from "@chronicle/szene";',
      loader: "ts", resolveDir: root,
    },
    format: "iife", globalName: "reviewHashes",
  });
  const context = { TextEncoder } as { TextEncoder: typeof TextEncoder; reviewHashes: BrowserHashes };
  // This evaluates and calls the actual browser bundle without Node globals or a
  // crypto polyfill. A Buffer/process/require dependency fails when exercised.
  runInNewContext(result.outputFiles![0]!.text, context);
  return context.reviewHashes;
}

const oracle = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

describe("independent browser entrypoint review", () => {
  it.each(["TacticalPreparation.tsx", "TacticalEntitiesEditor.tsx", "TacticalImport.tsx", "tactical-entities.ts"])(
    "%s resolves without importing Node builtins", async file => {
      const result = await browserBundle({ entryPoints: [`packages/client/src/features/${file}`] });
      expect(result.outputFiles![0]!.text).not.toMatch(/\b(?:Buffer|createHash)\b/);
      if (file === "TacticalImport.tsx" || file === "tactical-entities.ts") {
        // These imports describe transport data. They must not load the server
        // import adapters, scene implementation or hashing merely to name types.
        const inputs = Object.keys(result.metafile!.inputs);
        expect(inputs.some(path => /packages\/(?:core|szene|forge)\//.test(path))).toBe(false);
      }
    },
  );

  it("preserves UTF-8 source hashes without Node globals, including unpaired surrogates", async () => {
    const hashes = await hashesWithoutNode();
    const samples = ["", "abc", "\u00e4", "\ud800", "\udc00", "\ud800\udc00", "\ud800a\udc00", "\0\u007f", "\u0061\u0308"];
    for (const size of [54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1_000_003]) samples.push("a".repeat(size));
    for (const text of samples) expect(hashes.textHash(text), `UTF-8 length ${Buffer.byteLength(text)}`).toBe(oracle(text));
  });

  it("preserves canonical bytes, derived ids and Weltkeim hashes in the browser bundle", async () => {
    const hashes = await hashesWithoutNode();
    const value = { z: ["\ud800", "\ud83d\uddfa\ufe0f"], "\u0130": "i", a: 1, I: 0, i: -0 };
    const expectedJson = '{"I":0,"a":1,"i":0,"z":["\\ud800","\ud83d\uddfa\ufe0f"],"\u0130":"i"}';
    expect(hashes.canonicalJson(value)).toBe(expectedJson);
    expect(hashes.canonicalHash(value)).toBe(oracle(expectedJson));
    const id = { erzeuger: "azgaar-fmg", version: "1.138.2", keim: "chronicle-1", kind: "knoten", pfad: ["burg", "Rendale"] } as const;
    const idBytes = '{"erzeuger":"azgaar-fmg","keim":"chronicle-1","kind":"knoten","pfad":["burg","Rendale"],"version":"1.138.2"}';
    expect(hashes.deriveId(id)).toBe(oracle(idBytes).slice(0, 32));
    const seed = hashes.weltkeim({ generator: "review", version: "1", seed: "fixed", optionen: { z: 2, a: 1 } });
    const seedBytes = '{"generator":"review","optionen":{"a":1,"z":2},"seed":"fixed","version":"1"}';
    expect(seed.keimHash).toBe(oracle(seedBytes));
    expect(Object.isFrozen(seed)).toBe(true);
    expect(Object.isFrozen(seed.optionen)).toBe(true);
  });
});
