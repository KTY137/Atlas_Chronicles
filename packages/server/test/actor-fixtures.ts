import type { Db } from "../src/db/index.ts";

/** Raw SQL fixtures must opt into the current control model, just like production
 * join/instantiate commands. This helper is never used as a runtime fallback. */
export async function seedActorControl(db: Db, campaignId: string, actorId: string, userId: string) {
  await db.query(`INSERT INTO actor_profiles(actor_id,campaign_id,kind,version)
    VALUES($1,$2,'player_character',1)`, [actorId,campaignId]);
  await db.query(`INSERT INTO actor_controllers(actor_id,campaign_id,user_id,permission,version)
    VALUES($1,$2,$3,'control',1)`, [actorId,campaignId,userId]);
  await db.query(`INSERT INTO reader_perspectives(campaign_id,user_id,actor_id,version)
    SELECT campaign_id,user_id,actor_id,1 FROM campaign_memberships
      WHERE campaign_id=$1 AND user_id=$2 AND actor_id=$3 AND role='spieler'
    ON CONFLICT(campaign_id,user_id) DO NOTHING`, [campaignId,userId,actorId]);
}
