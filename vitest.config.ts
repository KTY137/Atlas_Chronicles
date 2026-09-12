import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@chronicle/theme": pkg("theme"),
      // Der eigene Einstieg fuer fremd lizenzierte Beispielregelwerke; muss vor dem
      // kuerzeren Alias stehen, sonst faengt dieser den Unterpfad ab.
      "@chronicle/rules/examples": fileURLToPath(new URL("./packages/rules/src/examples.ts", import.meta.url)),
      "@chronicle/rules": pkg("rules"),
      "@chronicle/protocol": pkg("protocol"),
      "@chronicle/core": pkg("core"),
      "@chronicle/chronik": pkg("chronik"),
      "@chronicle/chronist": pkg("chronist"),
      "@chronicle/projection": pkg("projection"),
      "@chronicle/szene": pkg("szene"),
      "@chronicle/forge": pkg("forge"),
      "@chronicle/io": pkg("io"),
      "@chronicle/server/host": fileURLToPath(new URL("./packages/server/src/host.ts", import.meta.url)),
      "@chronicle/server": pkg("server"),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    environment: "node",
    // CI belegt aus demselben Lauf, dass die pg-Tests wirklich liefen, statt die Suite ein
    // zweites Mal gegen eine bereits befuellte Datenbank zu fahren.
    reporters: process.env.VITEST_JSON_REPORT
      ? ["default", ["json", { outputFile: process.env.VITEST_JSON_REPORT }]]
      : ["default"],
    // Determinism gate G-RL1 / A14: the suite must not depend on host locale or zone.
    env: { TZ: "UTC" },
  },
});
