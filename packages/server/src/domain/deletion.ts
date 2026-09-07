/**
 * Kampagnenlöschung — der Gegenpfad zum Export.
 *
 * Bis 017 war eine Kampagne technisch nicht löschbar: es gab keine Funktion, und
 * `deny_history_mutation()` wies auch rohes SQL an 24 Historientabellen ab
 * (design/10-hosted-betrieb-und-auslieferung.md §1.1). Ein bezahlter Dienst muss löschen können.
 *
 * **Die Falle, der dieses Modul ausweicht:** Der naheliegende Griff wäre, die Tabellenliste des
 * Exports (`bundles.ts`) wiederzuverwenden. Sie ist aber bewusst eine Teilmenge — der Export
 * filtert `audit` nach Art, `campaign_messages` auf `kind='letter'` und lässt `credentials` sowie
 * `access_incidents` ganz weg. Gemessen am Schema: 71 Tabellen tragen `campaign_id`, der Export
 * kennt 60 davon. Die elf fehlenden sind der komplette Befehlsbus (`events`, `event_cursors`,
 * `commands`), alle fünf Medientabellen und die drei Beitrittstabellen. Ein Löschpfad aus der
 * Exportliste ließe genau diese als Waisen zurück.
 *
 * Deshalb führt dieses Modul eine **eigene** Liste, und `deletion.test.ts` leitet die Sollmenge
 * aus dem laufenden Schema her: Jede Tabelle mit `campaign_id` muss entweder gelöscht werden oder
 * in `UEBERLEBT` mit Begründung stehen. Eine neue Migration bricht den Test, bis jemand entscheidet.
 */
import type { Db } from "../db/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { Gone } from "./errors.ts";

export interface DeletionConfig { now?: () => number }

/**
 * Tabellen mit `campaign_id`, die eine Kampagne überleben — jede mit ihrem Grund.
 * Derzeit leer: alles, was eine `campaign_id` trägt, gehört auch der Kampagne.
 * Der Eintrag bleibt als benannte Stelle bestehen, damit eine künftige Ausnahme begründet wird
 * statt stillschweigend zu entstehen.
 */
export const UEBERLEBT: Readonly<Record<string, string>> = {};

/**
 * Tabellen ohne `campaign_id`, die dennoch zur Kampagne gehören, mit ihrer Eingrenzung.
 * `campaigns` ist die Kampagne selbst; die drei anderen erreichen sie über einen Umweg.
 */
export const UMWEG: Readonly<Record<string, string>> = {
  campaigns: "id=$1",
  revisions: "entry_id IN (SELECT id FROM entries WHERE campaign_id=$1)",
  lineage_events: "entry_id IN (SELECT id FROM entries WHERE campaign_id=$1)",
  import_acceptances: "artifact_id IN (SELECT id FROM artifacts WHERE campaign_id=$1)",
};

/**
 * Löschreihenfolge: Kinder vor Eltern, damit kein Fremdschlüssel bricht.
 *
 * Die zweite Gruppe ist die Einfügereihenfolge des Restores (`bundles.ts` `restoreOrder`)
 * rückwärts — dieselbe Abhängigkeitsordnung, in die andere Richtung gelesen. Die erste Gruppe
 * sind die Laufzeittabellen, die der Export nicht kennt; sie sind Blätter und gehen zuerst.
 *
 * `revisions` und `lineage_events` müssen vor `entries` stehen: Der Trigger aus 017 prüft ihre
 * Kampagnenzugehörigkeit über `entry_id -> entries`, dieser Umweg muss also noch tragen.
 */
export const LOESCHREIHENFOLGE: readonly string[] = [
  // Blatt: zeigt auf beide Vollmacht-Tabellen, auf die niemand zurückzeigt.
  "zugangsvorfaelle",
  // Ebenfalls Blatt: die Beziehungskante zeigt auf Passage und Einträge, niemand zeigt auf sie.
  "beziehungen",
  // Laufzeit und Beitritt — vom Export nicht erfasst.
  "media_cleanup", "media_blocks", "media_presence", "media_whisper_members", "media_rooms",
  "events", "event_cursors", "commands",
  "pairing_codes", "join_requests", "invitations",
  // Restore-Reihenfolge rückwärts.
  "wiki_asset_uses", "wiki_assets",
  "betreten_command_receipts", "betreten_karten", "tactical_map_nodes",
  "authoring_events", "publication_routes", "entry_publications", "campaign_publications",
  "campaign_theme_pins", "theme_preset_revisions", "theme_presets",
  "tactical_transitions", "tactical_command_receipts", "tactical_token_states",
  "session_tactical_states", "scene_token_plans", "scene_tactical_plans",
  "tactical_map_anchors", "tactical_map_revisions", "tactical_maps", "tactical_sources",
  "actor_inventory_events", "item_instances", "reader_perspectives", "actor_controllers",
  "actor_profiles", "item_template_revisions", "item_templates",
  "actor_template_revisions", "actor_templates",
  "access_incidents", "audit", "campaign_messages",
  "atlas_revelations", "atlas_nodes", "atlas_maps",
  "reading_watermarks", "letter_delivery_receipts", "letter_recipients", "letters",
  "week_clocks", "confirmed_mints", "action_rolls", "action_vollmachten",
  "game_sessions", "week_baselines", "scenes", "actor_sheets",
  "campaign_rule_pins", "rule_packages",
  "revelations", "rolls", "vollmachten",
  "import_acceptances", "entry_aliases", "lineage_events", "artifacts", "passages",
  "revisions", "entries",
  "campaign_memberships", "actors",
  "campaigns",
];

export interface DeletionReceipt {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly deletedAt: number;
  /** Nur Tabellen, aus denen tatsächlich Zeilen verschwanden. */
  readonly rowCounts: Readonly<Record<string, number>>;
}

export function createDeletion(db: Db, cfg: DeletionConfig = {}) {
  const now = cfg.now ?? Date.now;

  /**
   * Löscht eine Kampagne vollständig. Nur die Spielleitung darf das, und nur für ihre eigene
   * Kampagne — `requireMember` beantwortet beides in einem Schritt und wirft sonst dieselbe 404
   * wie jede andere Verweigerung.
   *
   * Alles läuft in EINER Transaktion. Der Schlüssel für den Historienriegel wird per
   * `set_config(..., true)` gesetzt, also transaktionslokal; er endet mit dem Commit oder
   * Rollback und kann die Verbindung nicht überdauern.
   */
  async function deleteCampaign(userId: string, campaignId: string): Promise<DeletionReceipt> {
    return db.transaction(async (tx) => {
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      const campaign = (await tx.query<{ name: string }>("SELECT name FROM campaigns WHERE id=$1", [campaignId])).rows[0];
      if (!campaign) throw new Gone("campaign");

      // Parametrisiert statt SET LOCAL, weil SET LOCAL keinen Platzhalter annimmt.
      await tx.query("SELECT set_config('chronicle.deleting_campaign', $1, true)", [campaignId]);

      const rowCounts: Record<string, number> = {};
      for (const table of LOESCHREIHENFOLGE) {
        // Die Namen stammen ausschließlich aus der Konstante oben, nie aus einer Eingabe.
        const where = UMWEG[table] ?? "campaign_id=$1";
        const result = await tx.query(`DELETE FROM "${table}" WHERE ${where}`, [campaignId]);
        if (result.rowCount > 0) rowCounts[table] = result.rowCount;
      }

      const deletedAt = now();
      await tx.query(
        `INSERT INTO campaign_deletions(campaign_id,campaign_name,deleted_by,deleted_at,row_counts)
         VALUES($1,$2,$3,$4,$5)`,
        [campaignId, campaign.name, userId, deletedAt, JSON.stringify(rowCounts)],
      );
      return { campaignId, campaignName: campaign.name, deletedAt, rowCounts };
    });
  }

  return { deleteCampaign };
}
