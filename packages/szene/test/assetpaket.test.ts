import { describe, expect, it } from "vitest";
import {
  ASSETPAKET_LIMITS, AssetpaketValidationError, assetIndex, assetVerweis, parseAssetpaket,
  pruefeStampVerweise, serializeAssetpaket, type AssetpaketV1, type SceneDoc,
} from "@chronicle/szene";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

const lizenz = (over: Record<string, unknown> = {}) => ({
  spdx: "CC0-1.0", inhaber: "Chronicle", herkunft: "eigen", quelle: null, datei: "lizenz.txt", textSha256: HASH_C, ...over,
});
const asset = (over: Record<string, unknown> = {}) => ({
  name: "truhe", art: "gefaess", datei: "gefaess/truhe.svg", mimeType: "image/svg+xml", sha256: HASH_A, bytes: 512,
  groesse: [64, 64], anker: [32, 32], einheiten: [1, 1], kachelbar: false, schlagworte: ["holz", "behaelter"], lizenz: null, ...over,
});
const paket = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1, kind: "asset-pack", id: "pk.probe", titel: "Probe", version: "1.0.0", urheber: "Chronicle",
  zellgroesse: 64, lizenz: lizenz(), assets: [asset()], ...over,
});

describe("Assetpaket v1 — der Referent von Stamp.a", () => {
  it("nimmt ein vollständiges Paket an und friert es ein", () => {
    const gelesen = parseAssetpaket(paket());
    expect(gelesen.id).toBe("pk.probe");
    expect(gelesen.assets).toHaveLength(1);
    expect(Object.isFrozen(gelesen)).toBe(true);
    expect(Object.isFrozen(gelesen.assets[0])).toBe(true);
    expect(() => { (gelesen.assets as unknown as { push: (v: unknown) => void }).push(asset()); }).toThrow();
  });

  it("nimmt denselben Inhalt als JSON-Text an", () => {
    expect(parseAssetpaket(JSON.stringify(paket()))).toStrictEqual(parseAssetpaket(paket()));
  });

  it("weist eine unbekannte Eigenschaft zurück statt sie zu ignorieren", () => {
    expect(() => parseAssetpaket(paket({ extra: 1 }))).toThrow(/explicit schema migration/);
    expect(() => parseAssetpaket(paket({ assets: [asset({ extra: 1 })] }))).toThrow(/explicit schema migration/);
  });

  it("weist ein anderes Profil zurück", () => {
    expect(() => parseAssetpaket(paket({ schemaVersion: 2 }))).toThrow(/unsupported asset pack profile/);
    expect(() => parseAssetpaket(paket({ kind: "tactical-map" }))).toThrow(/unsupported asset pack profile/);
  });

  describe("Pfade — ein Paket darf niemals aus sich herauszeigen", () => {
    for (const [name, pfad] of [
      ["Traversal", "../../etc/passwd"], ["Punkt-Segment", "boden/./x.svg"], ["absolut", "/boden/x.svg"],
      ["Windows-Trenner", "boden\\x.svg"], ["Großbuchstabe", "Boden/X.svg"], ["leeres Segment", "boden//x.svg"],
      ["URL", "https://host/x.svg"], ["Laufwerk", "c:/x.svg"],
    ] as const) {
      it(`weist ${name} zurück`, () => {
        expect(() => parseAssetpaket(paket({ assets: [asset({ datei: pfad })] }))).toThrow(AssetpaketValidationError);
        expect(() => parseAssetpaket(paket({ lizenz: lizenz({ datei: pfad }) }))).toThrow(AssetpaketValidationError);
      });
    }
  });

  it("weist doppelte Namen und doppelte Dateien zurück", () => {
    expect(() => parseAssetpaket(paket({ assets: [asset(), asset({ datei: "gefaess/zwei.svg" })] }))).toThrow(/duplicate asset name/);
    expect(() => parseAssetpaket(paket({ assets: [asset(), asset({ name: "kiste" })] }))).toThrow(/duplicate file/);
  });

  it("beansprucht die Lizenzdatei ebenfalls, damit kein Asset sie überschreibt", () => {
    expect(() => parseAssetpaket(paket({ assets: [asset({ datei: "lizenz.txt" })] }))).toThrow(/duplicate file/);
  });

  it("verlangt für fremde Herkunft eine benannte Quelle", () => {
    expect(() => parseAssetpaket(paket({ lizenz: lizenz({ herkunft: "extern", quelle: null }) }))).toThrow(/external provenance requires a named source/);
    expect(parseAssetpaket(paket({ lizenz: lizenz({ herkunft: "extern", quelle: "https://example.org/pack" }) })).lizenz.herkunft).toBe("extern");
  });

  it("weist Quellen zurück, die keine glaubwürdige Attribution sind", () => {
    for (const quelle of ["javascript:alert(1)", "file:///etc/passwd", "https://user:pw@host/x", "nicht mal eine URL"]) {
      expect(() => parseAssetpaket(paket({ lizenz: lizenz({ herkunft: "extern", quelle }) }))).toThrow(AssetpaketValidationError);
    }
  });

  it("verlangt einen Lizenztext-Hash — ein Bezeichner allein ist eine Behauptung", () => {
    expect(() => parseAssetpaket(paket({ lizenz: lizenz({ textSha256: "kurz" }) }))).toThrow(/SHA-256/);
    expect(() => parseAssetpaket(paket({ lizenz: lizenz({ textSha256: HASH_A.toUpperCase() }) }))).toThrow(/SHA-256/);
    expect(parseAssetpaket(paket({ lizenz: lizenz({ spdx: "LicenseRef-Azgaar-FMG-1.0" }) })).lizenz.spdx).toBe("LicenseRef-Azgaar-FMG-1.0");
  });

  it("weist ein leeres Paket, kaputte Versionen und unbekannte Aufzählungen zurück", () => {
    expect(() => parseAssetpaket(paket({ assets: [] }))).toThrow(/an empty pack is not a pack/);
    expect(() => parseAssetpaket(paket({ version: "1.0" }))).toThrow(/three-part numeric version/);
    expect(() => parseAssetpaket(paket({ assets: [asset({ art: "dekoration" })] }))).toThrow(/expected boden/);
    expect(() => parseAssetpaket(paket({ assets: [asset({ mimeType: "text/html" })] }))).toThrow(/expected image/);
  });

  it("hält sich an seine Grenzen", () => {
    expect(() => parseAssetpaket(paket({ zellgroesse: 0 }))).toThrow(AssetpaketValidationError);
    expect(() => parseAssetpaket(paket({ assets: [asset({ bytes: 0 })] }))).toThrow(AssetpaketValidationError);
    expect(() => parseAssetpaket(paket({ assets: [asset({ groesse: [0, 64] })] }))).toThrow(AssetpaketValidationError);
    expect(() => parseAssetpaket(paket({ assets: [asset({ einheiten: [1] })] }))).toThrow(/pair required/);
    const zuVieleTags = Array.from({ length: ASSETPAKET_LIMITS.schlagworte + 1 }, (_, i) => `t${i}`);
    expect(() => parseAssetpaket(paket({ assets: [asset({ schlagworte: zuVieleTags })] }))).toThrow(AssetpaketValidationError);
    expect(() => parseAssetpaket(paket({ assets: [asset({ schlagworte: ["holz", "holz"] })] }))).toThrow(/duplicate tag/);
  });

  it("lässt einen negativen Anker zu — der Ankerpunkt ist nicht zwingend im Bild", () => {
    expect(parseAssetpaket(paket({ assets: [asset({ anker: [-8, 96] })] })).assets[0]!.anker).toStrictEqual([-8, 96]);
  });

  it("weist Prototyp-Schlüssel und doppelte Schlüssel im rohen JSON zurück", () => {
    // Built as text on purpose: an object literal spread with `__proto__` sets the prototype and
    // never produces the key, so the literal form of this test would silently assert nothing.
    const rumpf = JSON.stringify(paket()).slice(1);
    expect(() => parseAssetpaket(`{"__proto__":{"polluted":true},${rumpf}`)).toThrow(/prototype key forbidden/);
    expect(() => parseAssetpaket(`{"id":"pk.zwei",${rumpf}`)).toThrow(/duplicate object key/);
  });

  it("serialisiert schlüsselsortiert und stabil", () => {
    const a = serializeAssetpaket(parseAssetpaket(paket()));
    const b = serializeAssetpaket(parseAssetpaket(JSON.parse(a)));
    expect(a).toBe(b);
    expect(a.indexOf('"assets"')).toBeLessThan(a.indexOf('"id"'));
    expect(a.indexOf('"id"')).toBeLessThan(a.indexOf('"titel"'));
  });
});

describe("Auflösung von Stamp.a", () => {
  const zwei: AssetpaketV1 = parseAssetpaket(paket({
    assets: [asset(), asset({ name: "fass", datei: "gefaess/fass.svg", sha256: HASH_B, lizenz: lizenz({ spdx: "CC-BY-4.0", herkunft: "extern", quelle: "https://example.org/fass", datei: "fremd/lizenz.txt" }) })],
  }));

  it("setzt genau eine Referenz zusammen", () => {
    expect(assetVerweis(zwei.id, "truhe")).toBe("pk.probe/truhe");
  });

  it("löst Paketlizenz und Asset-Überschreibung getrennt auf", () => {
    const index = assetIndex([zwei]);
    expect(index.get("pk.probe/truhe")!.lizenz.spdx).toBe("CC0-1.0");
    expect(index.get("pk.probe/fass")!.lizenz.spdx).toBe("CC-BY-4.0");
    expect(index.get("pk.probe/fass")!.lizenz.quelle).toBe("https://example.org/fass");
  });

  it("weist zwei Pakete mit derselben Id zurück, statt eines gewinnen zu lassen", () => {
    expect(() => assetIndex([zwei, zwei])).toThrow(/duplicate pack id/);
  });

  it("meldet unauflösbare Verweise, wirft aber nicht — das ist eine Projektionsfrage", () => {
    const szene: SceneDoc = {
      v: 3, size: [640, 640], regions: [], places: [],
      stamps: [
        { id: "s1", a: "pk.probe/truhe", x: 0, y: 0, s: 1, r: 0, l: 0 },
        { id: "s2", a: "pk.fremd/baum", x: 0, y: 0, s: 1, r: 0, l: 0 },
      ],
    };
    expect(pruefeStampVerweise(szene, assetIndex([zwei]))).toStrictEqual([{ stampId: "s2", verweis: "pk.fremd/baum" }]);
  });
});
