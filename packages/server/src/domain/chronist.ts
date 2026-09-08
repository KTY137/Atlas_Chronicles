// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { pruefeChronik, type Befund } from "@chronicle/chronist";
import type { Db } from "../db/index.ts";
import type { ChronistServiceConfig } from "./chronist/runtime.ts";
import { createChronistService } from "./chronist/service.ts";
import { createZeitleiste } from "./zeitleiste.ts";

/** Existing deterministic review plus the explicitly started, durable Chronist service. */
export function createChronist(db: Db, config: ChronistServiceConfig = {}) {
  const zeitleiste = createZeitleiste(db, config);

  async function vorschlaege(userId: string, campaignId: string): Promise<readonly Befund[]> {
    const stand = await zeitleiste.zeitleiste(userId, campaignId);
    return pruefeChronik(stand.ereignisse, stand.ohneJahr);
  }

  return { vorschlaege, ...createChronistService(db, config) };
}
export type { ChronistServiceConfig, ChronistRuntimeConfig, ChronistProviderBinding } from "./chronist/runtime.ts";
