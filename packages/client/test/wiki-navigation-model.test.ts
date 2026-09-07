import { describe, expect, it } from "vitest";
import { baueNavigation, brotkrumen, type NavigationDaten } from "../src/features/wiki-navigation-model";

const leer: NavigationDaten = { kategorien: [], arten: [], artikel: [] };

describe("das Navigationsmodell ordnet, ohne zu erfinden", () => {
  it("hängt Unterkategorien unter ihre Elternkategorie und zählt beide getrennt", () => {
    const daten: NavigationDaten = {
      ...leer,
      kategorien: [
        { id: "g", slug: "goetter", titel: "Götter", elternId: null, sichtbarkeit: "silhouette", bekannt: 1, gesamt: 3 },
        { id: "a", slug: "alte", titel: "Alte Götter", elternId: "g", sichtbarkeit: "silhouette", bekannt: 1, gesamt: 1 },
      ],
      artikel: [
        { id: "1", titel: "Der Namenlose", slug: "der-namenlose", art: "charakter", elternId: null, kategorieIds: ["a"], bekannt: true },
        { id: "2", art: "charakter", elternId: null, kategorieIds: ["g"], bekannt: false },
      ],
    };
    const baum = baueNavigation(daten);
    expect(baum).toHaveLength(1);
    expect(baum[0]).toMatchObject({ id: "g", titel: "Götter", bekannt: 1, gesamt: 3 });
    expect(baum[0]!.kinder).toHaveLength(1);
    expect(baum[0]!.kinder[0]).toMatchObject({ id: "a", titel: "Alte Götter" });
    expect(baum[0]!.kinder[0]!.artikel.map(a => a.id)).toEqual(["1"]);
    // Der unbekannte Artikel hängt in der Oberkategorie und bleibt namenlos.
    expect(baum[0]!.artikel).toEqual([expect.objectContaining({ id: "2", bekannt: false })]);
    expect(JSON.stringify(baum)).not.toMatch(/undefined/);
  });

  it("fällt für Artikel ohne Kategorie auf die Art zurück, statt sie verschwinden zu lassen", () => {
    const daten: NavigationDaten = {
      ...leer,
      arten: [{ art: "ort", bekannt: 1, gesamt: 1 }],
      artikel: [{ id: "3", titel: "Andaria", slug: "andaria", art: "ort", elternId: null, kategorieIds: [], bekannt: true }],
    };
    const baum = baueNavigation(daten);
    expect(baum).toEqual([expect.objectContaining({ herkunft: "art", titel: "Orte", artikel: [expect.objectContaining({ id: "3" })] })]);
  });

  it("führt die Brotkrume entlang der Elternkette und macht Unbekanntes namenlos statt unsichtbar", () => {
    const artikel = [
      { id: "stadt", titel: "Andaria", slug: "andaria", art: "ort", elternId: null, kategorieIds: [], bekannt: true },
      { id: "bezirk", art: "ort", elternId: "stadt", kategorieIds: [], bekannt: false },
      { id: "taverne", titel: "Zum Anker", slug: "zum-anker", art: "ort", elternId: "bezirk", kategorieIds: [], bekannt: true },
    ];
    expect(brotkrumen("taverne", artikel)).toEqual([
      { id: "stadt", titel: "Andaria", bekannt: true },
      { id: "bezirk", titel: null, bekannt: false },
      { id: "taverne", titel: "Zum Anker", bekannt: true },
    ]);
  });

  it("bricht eine im Kreis gelegte Elternkette ab, statt endlos zu laufen", () => {
    const artikel = [
      { id: "a", titel: "A", slug: "a", art: "ort", elternId: "b", kategorieIds: [], bekannt: true },
      { id: "b", titel: "B", slug: "b", art: "ort", elternId: "a", kategorieIds: [], bekannt: true },
    ];
    const kette = brotkrumen("a", artikel);
    expect(kette.length).toBeLessThanOrEqual(2);
    expect(kette[kette.length - 1]).toMatchObject({ id: "a" });
  });
});
