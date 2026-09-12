// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type } from "@sinclair/typebox";

/** The portrait has its own revision: changing it cannot overwrite a character sheet. */
export const ActorPortraitChange = Type.Object({ expectedVersion: Type.Integer({ minimum: 0, maximum: 2_147_483_646 }) }, { additionalProperties: false });
export const ACTOR_PORTRAIT_LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, dimension: 4096 });
export interface ActorPortraitCard {
  actorId: string;
  version: number;
  image: { mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; sha256: string; bytes: number; width: number; height: number } | null;
  updatedAt: number | null;
}
