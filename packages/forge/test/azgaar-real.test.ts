import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { textHash } from "@chronicle/core";
import { pruefeContainment } from "@chronicle/szene";
import { importiereAzgaar } from "../src/index.ts";

const source = gunzipSync(readFileSync(new URL("./fixtures/azgaar-full.json.gz", import.meta.url))).toString("utf8");
const provenance = JSON.parse(readFileSync(new URL("./fixtures/provenance.json", import.meta.url), "utf8"));
describe("real Azgaar v1.151.2 Full export", () => {
  it("imports the recorded source artifact, with complete cells and every live burg", () => {
    expect(textHash(source)).toBe(provenance.sha256);
    expect(Buffer.byteLength(source)).toBe(provenance.bytes);
    const imported = importiereAzgaar(source);
    expect(imported.keim.version).toBe("1.151.2");
    expect(imported.titel).toBe("Koria");
    expect(imported.orte).toHaveLength(698);
    expect(imported.zellen).toHaveLength(4733);
    expect(pruefeContainment(imported.knoten)).toEqual([]);
    expect(imported.szene.places).toHaveLength(698);
    expect(imported.bericht.unterdrueckteNotizen).toBeGreaterThan(0);
    expect(imported.knoten.every((n) => n.sichtAnker === null)).toBe(true);
  });
  it("repeats the production import with stable node IDs and geometry", () => {
    const first = importiereAzgaar(source);
    const second = importiereAzgaar(source);
    expect(first.knoten).toEqual(second.knoten);
    expect(first.szene).toEqual(second.szene);
    expect(first.bericht).toEqual(second.bericht);
  });
});
