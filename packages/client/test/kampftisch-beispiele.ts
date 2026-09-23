// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KarteFuerLeitung, KarteFuerRunde } from "@chronicle/protocol";

export const LEITUNGSKARTE: KarteFuerLeitung = {
  id: "w1", name: "Graf Veyl", nameFuerRunde: "Vermummte Gestalt", seite: "gegner", lage: "feld", actorId: "a1", initiative: 17, ordnung: 0,
  initiativeRollId: null, gewuerfelt: false, amZug: true, sicht: { schema: 1, standard: "worte", balken: {}, zustaende: true, bild: true },
  vomKampfAngelegt: false, version: 1, bogenVersion: 3,
  balken: [{ id: "hp", label: "Lebenspunkte", wert: 40, hoechst: 100, art: "leben", maske: "worte", fuerRunde: { id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "worte", stufe: "knapp" } }],
  zustaende: [{ id: "blutend", name: "Blutend" }], bild: null, aufgebraucht: false,
};
export const RUNDENKARTE: KarteFuerRunde = {
  id: "w1", name: "Vermummte Gestalt", seite: "gegner", lage: "feld", initiative: 17, gewuerfelt: false, amZug: false, eigene: false,
  balken: [{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "worte", stufe: "knapp" }], zustaende: [], bild: null,
};
