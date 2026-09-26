// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash } from "@chronicle/core";
import { rauschen } from "../src/kartenwerk.ts";

export { erzeugeHaus, geschossName, planeHaus, rahmenRechteck } from "../src/index.ts";
export type { Haus } from "../src/index.ts";
/** Ein reproduzierbarer Zufall für Planer-Tests. */
export const rauschenFuerTest = (text: string) => rauschen(canonicalHash({ test: text }));
