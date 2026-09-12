// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Value } from "@sinclair/typebox/value";
import { vermisseBild } from "@chronicle/io";
import { ACTOR_PORTRAIT_LIMITS, ActorPortraitChange, type ActorPortraitCard } from "../../../protocol/src/actor-portrait.ts";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { ActorValidationError, authorizeActor } from "./actors.ts";
import { Conflict, Gone } from "./errors.ts";

interface PortraitRow {
  actor_id: string; version: number; mime: NonNullable<ActorPortraitCard["image"]>["mime"] | null;
  sha256: string | null; bytes: string | null; breite: number | null; hoehe: number | null;
  daten: string | null; updated_by: string; updated_at: string;
}
const card = (actorId: string, row: PortraitRow | undefined): ActorPortraitCard => ({
  actorId, version: row?.version ?? 0, updatedAt: row ? Number(row.updated_at) : null,
  image: row?.mime ? { mime: row.mime, sha256: row.sha256!, bytes: Number(row.bytes), width: row.breite!, height: row.hoehe! } : null,
});

export function createActorPortraits(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function access(tx: Db, userId: string, campaignId: string, actorId: string, write: boolean) {
    // Actor/controller mutations lock this same campaign row. Recheck authority under the lock
    // so a concurrent revocation or deletion cannot race an upload into a stale grant.
    const locked = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 ${write ? "FOR UPDATE OF c" : "FOR SHARE OF c"} FOR SHARE OF m`, [campaignId, userId]);
    if (!locked.rowCount) throw new Gone();
    const member = await createCampaigns(tx, cfg).requireMember(userId, campaignId);
    await authorizeActor(tx, member, actorId, { active: write });
  }
  const read = async (tx: Db, campaignId: string, actorId: string) =>
    (await tx.query<PortraitRow>("SELECT * FROM actor_portraits WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId])).rows[0];

  async function get(userId: string, campaignId: string, actorId: string): Promise<ActorPortraitCard> {
    return db.transaction(async tx => { await access(tx, userId, campaignId, actorId, false); return card(actorId, await read(tx, campaignId, actorId)); });
  }
  async function file(userId: string, campaignId: string, actorId: string) {
    return db.transaction(async tx => {
      await access(tx, userId, campaignId, actorId, false);
      const row = await read(tx, campaignId, actorId);
      if (!row?.mime || !row.daten) throw new Gone();
      return { mime: row.mime, sha256: row.sha256!, data: Buffer.from(row.daten, "base64") };
    });
  }
  async function change(userId: string, campaignId: string, actorId: string, expectedVersion: number, data: Uint8Array | null): Promise<ActorPortraitCard> {
    if (!Value.Check(ActorPortraitChange, { expectedVersion })) throw new ActorValidationError("Bitte den aktuellen Stand des Porträts laden.");
    return db.transaction(async tx => {
      await access(tx, userId, campaignId, actorId, true);
      if (data && data.byteLength > ACTOR_PORTRAIT_LIMITS.bytes) throw new ActorValidationError("Das Porträt darf höchstens 8 MB groß sein.");
      const measured = data ? vermisseBild(data) : null;
      if (measured && (measured.breite > ACTOR_PORTRAIT_LIMITS.dimension || measured.hoehe > ACTOR_PORTRAIT_LIMITS.dimension))
        throw new ActorValidationError("Das Porträt darf höchstens 4096 × 4096 Pixel groß sein.");
      const previous = await read(tx, campaignId, actorId);
      // A lost acknowledgement may be retried with the same original file or removal.
      if (previous?.version === expectedVersion + 1 && previous.updated_by === userId && previous.sha256 === (measured?.sha256 ?? null)) return card(actorId, previous);
      if ((previous?.version ?? 0) !== expectedVersion) throw new Conflict();
      await tx.query(`INSERT INTO actor_portraits(actor_id,campaign_id,version,mime,sha256,bytes,breite,hoehe,daten,updated_by,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT(actor_id,campaign_id) DO UPDATE SET version=EXCLUDED.version,mime=EXCLUDED.mime,sha256=EXCLUDED.sha256,
          bytes=EXCLUDED.bytes,breite=EXCLUDED.breite,hoehe=EXCLUDED.hoehe,daten=EXCLUDED.daten,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
      [actorId, campaignId, expectedVersion + 1, measured?.mime ?? null, measured?.sha256 ?? null, measured?.bytes ?? null,
        measured?.breite ?? null, measured?.hoehe ?? null, data ? Buffer.from(data).toString("base64") : null, userId, now()]);
      return card(actorId, await read(tx, campaignId, actorId));
    });
  }
  return { get, file, upload: (userId: string, campaignId: string, actorId: string, expectedVersion: number, data: Uint8Array) => change(userId, campaignId, actorId, expectedVersion, data),
    remove: (userId: string, campaignId: string, actorId: string, expectedVersion: number) => change(userId, campaignId, actorId, expectedVersion, null) };
}
