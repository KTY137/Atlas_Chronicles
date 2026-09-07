import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { textHash } from "@chronicle/core";
import { pruefeContainment } from "@chronicle/szene";
import { importiereAzgaar } from "../src/index.ts";

const source = gunzipSync(readFileSync(new URL("./fixtures/azgaar-full.json.gz", import.meta.url))).toString("utf8");
const provenance = JSON.parse(readFileSync(new URL("./fixtures/provenance.json", import.meta.url), "utf8"));
describe("real Azgaar v1.151.2 Full export", () => {
  it("imports the recorded source artifact, with complete cells, every live burg and every benannten Marker", () => {
    expect(textHash(source)).toBe(provenance.sha256);
    expect(Buffer.byteLength(source)).toBe(provenance.bytes);
    const imported = importiereAzgaar(source);
    expect(imported.keim.version).toBe("1.151.2");
    expect(imported.titel).toBe("Koria");
    // 698 Burgen + 73 Marker, die eine Notiz mit Namen tragen.
    expect(imported.orte).toHaveLength(771);
    expect(imported.orte.filter((ort) => ort.merkmale["sourceMarkerId"] !== undefined)).toHaveLength(73);
    expect(imported.bericht.ausgelasseneMarker).toBe(0);
    expect(imported.zellen).toHaveLength(4733);
    expect(pruefeContainment(imported.knoten)).toEqual([]);
    expect(imported.szene.places).toHaveLength(771);
    // Was bleibt: die Notizen zu Regimentern, Reichen und Provinzen — sie gehoeren zu keinem Marker.
    expect(imported.bericht.unterdrueckteNotizen).toBe(33);
    expect(imported.knoten.every((n) => n.sichtAnker === null)).toBe(true);
  });
  // 20 s statt der voreingestellten 5. Dieser Test importiert das echte 2-MB-Artefakt **zweimal**,
  // und ein Import misst auf einer belasteten Maschine 1,2 bis 2,5 Sekunden — das Budget war nie
  // eines, es lief auf Glück. Gemessen, nachdem der Test an einer Änderung kippte, die
  // `importiereAzgaar` nicht berührt: derselbe Import lief mit der Änderung sogar schneller als
  // ohne. Ein Zeitbudget, das an fremdem Rauschen kippt, prüft nicht die Zusage dieses Tests
  // (stabile Ids und Geometrie über zwei Läufe), sondern die Tagesform des Rechners.
  it("repeats the production import with stable node IDs and geometry", { timeout: 20_000 }, () => {
    const first = importiereAzgaar(source);
    const second = importiereAzgaar(source);
    expect(first.knoten).toEqual(second.knoten);
    expect(first.szene).toEqual(second.szene);
    expect(first.bericht).toEqual(second.bericht);
  });
});
