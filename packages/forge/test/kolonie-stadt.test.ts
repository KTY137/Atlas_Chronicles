// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";
import { freieMauer } from "../src/stadt/gemeinsam.ts";
import { pruefeSiedlung } from "./siedlung-pruefen.ts";

const paket = parseAssetpaket(readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url)), "utf8"));
const gen = (keim: string, optionen: Record<string, unknown>) => erzeugeSiedlung({ keim, optionen: { setting: "scifi", ...optionen } }, paket);
const STANDORTE = ["ebene", "fluss", "kueste", "see", "insel"] as const;

/** Spec 2026-09-23-stadt-zukunft, Abschnitt 6: die Kolonie (Version 12). */
describe("Sci-Fi v12", () => {
  it("hat Kommandozentrale, Raumhafen mit Landefeldern, Wohnkuppeln und einen Schutzzaun mit Toren", () => {
    const s = gen("v12:s:a", { art: "stadt", standort: "ebene" });
    expect(s.version).toBe("12");
    expect(s.keim.optionen).toMatchObject({ mauer: true });
    const typen = s.bauwerke.map(b => b.typ);
    for (const t of ["kommando", "raumhafen", "raumstation", "medstation", "labor"]) expect(typen, t).toContain(t);
    const daecher = s.cartography.regions.flatMap(r => r.role === "building" && r.dach ? [r.dach] : []);
    expect(daecher.filter(d => d === "kuppel").length).toBeGreaterThanOrEqual(10);
    expect(daecher).toContain("plattform");
    expect(s.bauwerke.some(b => b.typ === "kirche" || b.typ === "taverne" || b.typ === "turm")).toBe(false);
    expect(s.karte.walls.length).toBeGreaterThan(8);
    // Tore: keine Hauptstraße wird von einem Zaunstück gekreuzt.
    const z = s.karte.grid.kind === "square" ? s.karte.grid.size : 1;
    const haupt = s.strassen.filter(x => x.art === "hauptstrasse").map(x => x.umriss);
    for (const w of s.karte.walls) {
      const [a, b] = w.points.map(([x, y]) => [x / z, y / z] as const) as [readonly [number, number], readonly [number, number]];
      for (const band of haupt) expect(freieMauer(a, b, [band]).length, w.id).toBe(1);
    }
    expect(s.cartography.labels?.some(l => ["Kommandodeck", "Zentralnabe"].includes(l.text))).toBe(true);
    expect(new Set(s.bauwerke.map(b => b.titel)).size).toBe(s.bauwerke.length);
  }, 30_000);
  it("lässt den Zaun auf Wunsch weg", () => {
    const s = gen("v12:s:b", { art: "stadt", standort: "ebene", mauer: false });
    expect(s.karte.walls.length).toBe(0);
    expect(s.keim.optionen).toMatchObject({ mauer: false });
  }, 30_000);
  it.each(STANDORTE)("%s: gültig, ohne Überlappung, alles an Straßen, nichts im Wasser, genug Gebäude", standort => {
    for (const art of ["weiler", "dorf", "stadt"] as const) {
      const s = gen(`v12:s:${standort}:${art}`, { art, standort }), wo = `${standort}/${art}`;
      pruefeSiedlung(s, wo);
      if (art !== "weiler") expect(s.bauwerke.length, wo).toBeGreaterThanOrEqual(Math.floor(s.bericht.angefordert * .5));
    }
  }, 60_000);
  it("ist deterministisch", () => {
    expect(gen("v12:s:det", { art: "dorf", standort: "fluss" })).toEqual(gen("v12:s:det", { art: "dorf", standort: "fluss" }));
  }, 30_000);
  it("nennt eine Kommando-Zone außerhalb der Stadt beim Namen des Settings", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "b", name: "Kommando", nutzung: "burg" as const, dichte: 1, polygon: [[0, 0], [.04, 0], [.04, .04], [0, .04]] as const }] };
    const s = gen("v12:s:burg", { art: "stadt", standort: "ebene", planung });
    expect(s.version).toBe("12");
    expect(s.bericht.ausgelassen.join(" ")).toContain("Kommandozentrale");
    expect(s.bericht.ausgelassen.join(" ")).not.toContain("Burg");
  }, 30_000);
  it("baut auf einem winzigen Außenposten wenigstens ein Gebäude", () => {
    expect(gen("v12:s:tiny", { art: "weiler", standort: "fluss", ausdehnung: [24, 18], bauwerke: 3 }).bauwerke.length).toBeGreaterThan(0);
  }, 30_000);
});
