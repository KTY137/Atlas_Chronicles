import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@chronicle/theme": pkg("theme"),
      "@chronicle/rules": pkg("rules"),
      "@chronicle/protocol": pkg("protocol"),
      "@chronicle/core": pkg("core"),
      "@chronicle/chronik": pkg("chronik"),
      "@chronicle/projection": pkg("projection"),
      "@chronicle/szene": pkg("szene"),
      "@chronicle/forge": pkg("forge"),
      "@chronicle/io": pkg("io"),
      "@chronicle/server": pkg("server"),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    environment: "node",
    // Determinism gate G-RL1 / A14: the suite must not depend on host locale or zone.
    env: { TZ: "UTC" },
  },
});
