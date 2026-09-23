// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { planContains, planOverlaps, type PlanPoint, type SettlementPlan, type SettlementZone, type BauwerkTyp, type KartenSetting } from "@chronicle/szene";
import { canonicalHash } from "@chronicle/core";

/** A whole roof belongs to one zone, never a centroid-only exemption for a protected area. */
export function roofZone(plan: SettlementPlan, roof: readonly PlanPoint[]): SettlementZone | "excluded" | undefined {
  if (plan.zonen.some(zone => zone.nutzung === "frei" && planOverlaps(zone.polygon, roof))) return "excluded";
  for (const zone of [...plan.zonen].reverse()) {
    if (roof.every(p => planContains(zone.polygon, p))) return zone;
    if (planOverlaps(zone.polygon, roof)) return "excluded";
  }
  return undefined;
}
/** Separate local draws keep density changes monotonic and leave the layout PRNG untouched. */
export const zoneDraw = (layoutHash: string, path: string, purpose: string) => Number.parseInt(canonicalHash([layoutHash, path, purpose]).slice(0, 8), 16) / 0x100000000;
export function zoneBuilding(zone: SettlementZone, setting: KartenSetting, draw: number): BauwerkTyp {
  const choices: Record<string, readonly BauwerkTyp[]> = setting === "gegenwart" ? {
    wohnen: ["wohnblock", "haus"], markt: ["supermarkt", "restaurant", "cafe", "bank"], handwerk: ["werkstatt", "fabrik", "lager"],
    hafen: ["lager", "werkstatt"], adel: ["haus", "museum", "bibliothek"], arm: ["wohnblock", "haus"],
    tempel: ["kirche", "bibliothek"], burg: ["polizei", "feuerwache"],
  } : setting === "scifi" ? {
    wohnen: ["raumstation", "medstation"], markt: ["kommando", "lager"], handwerk: ["werkstatt", "labor", "reaktor"],
    hafen: ["raumhafen", "lager"], adel: ["kommando", "raumstation"], arm: ["raumstation", "lager"],
    tempel: ["labor", "kommando"], burg: ["kommando", "reaktor"],
  } : {
    wohnen: ["haus", "haus", "taverne"], markt: ["taverne", "lager", "bank"], handwerk: ["schmiede", "werkstatt", "lager"],
    hafen: ["lager", "lager", "taverne"], adel: ["haus", "bibliothek", "kirche"], arm: ["haus", "haus", "lager"],
    tempel: ["kirche", "bibliothek", "haus"], burg: ["kaserne", "turm", "lager"],
  };
  const mix = choices[zone.nutzung];
  if (!mix) throw new Error("Freiflächen erhalten keine Gebäude.");
  return mix[Math.min(mix.length - 1, Math.floor(Math.max(0, draw) * mix.length))]!;
}
