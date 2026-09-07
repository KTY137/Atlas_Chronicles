import {
  CAMPAIGN_V13_TABLES as CAMPAIGN_TABLES, CAMPAIGN_EXCLUDED_TABLES, currentCampaignTables,
  createCurrentCampaignBundle as createCampaignBundle, validateCurrentCampaignBundle as validateCampaignBundle,
  currentCampaignSemanticDiff as campaignSemanticDiff, upgradeCampaignBundleV1, upgradeCampaignBundleV2, upgradeCampaignBundleV3, upgradeCampaignBundleV4,
  type CurrentCampaignBundle as CampaignBundle, type CampaignRow, type CampaignTablesV13 as CampaignTables,
  type CampaignTableNameV13 as CampaignTableName, type CampaignUpgradeReport, type CampaignUpgradeReportV2ToV3, type CampaignUpgradeReportV3ToV4, type CampaignUpgradeReportV4ToV5,
} from "@chronicle/io";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { migrate, type Db } from "../db/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { Conflict, Gone } from "./errors.ts";

const MIGRATION = "015_wiki_assets.sql";
const identityColumns = new Set(["owner_user_id", "user_id", "created_by", "author_user_id", "issued_by", "granted_by", "prepared_by", "installed_by", "started_by", "updated_by", "sent_by", "reader_user_id", "actor_user_id", "accepted_by", "captured_by", "published_by", "geholt_von"]);
const destinationTables = [...CAMPAIGN_TABLES.map(table => table.name), ...CAMPAIGN_EXCLUDED_TABLES.filter(name => name !== "schema_migrations")];
const excludedTables = new Set<string>(CAMPAIGN_EXCLUDED_TABLES);
const coveredColumns = new Map<string, ReadonlySet<string>>(CAMPAIGN_TABLES.map(table => [table.name,
  new Set([...table.columns, ...(table.name === "users" ? ["platform_role"] : [])]),
]));
// These identifiers come exclusively from the compiled format metadata above.
const quoted = (name: string) => `"${name}"`;
export const restoreOrder: readonly CampaignTableName[] = [
  "users", "universes", "campaigns", "actors", "campaign_memberships", "universe_memberships",
  "entries", "revisions", "passages", "artifacts", "lineage_events", "entry_aliases", "categories", "entry_categories", "import_acceptances",
  "vollmachten", "rolls", "revelations", "rule_packages", "campaign_rule_pins", "actor_sheets", "scenes",
  "week_baselines", "game_sessions", "action_vollmachten", "action_rolls", "confirmed_mints", "week_clocks",
  "letters", "letter_recipients", "letter_delivery_receipts", "reading_watermarks",
  "atlas_maps", "atlas_nodes", "atlas_revelations", "campaign_messages", "audit", "access_incidents",
  "actor_templates", "actor_template_revisions", "item_templates", "item_template_revisions",
  "actor_profiles", "actor_controllers", "reader_perspectives", "item_instances", "actor_inventory_events",
  "tactical_sources", "tactical_maps", "tactical_map_revisions", "tactical_map_anchors",
  "scene_tactical_plans", "scene_token_plans", "session_tactical_states", "tactical_token_states",
  "tactical_command_receipts", "tactical_transitions",
  "theme_presets", "theme_preset_revisions", "campaign_theme_pins", "campaign_publications",
  "entry_publications", "publication_routes", "authoring_events",
  "tactical_map_nodes", "betreten_karten", "betreten_command_receipts",
  // Erst die Assets, dann ihre Verwendungen: eine Verwendung zeigt auf Asset UND Passage.
  "wiki_assets", "wiki_asset_uses",
  // Zuletzt der Zugangsvorfall: er zeigt auf eine der beiden Vollmacht-Tabellen und auf ein
  // Mitglied, alle drei stehen weiter oben.
  "zugangsvorfaelle",
  // Die Beziehungskante zeigt auf ihre Passage und auf beide Eintraege; alle drei stehen oben.
  "beziehungen",
  // Zuletzt die Kampfbuehne: erst die Buehne, dann die Karten darauf. Ein Teilnehmer zeigt auf
  // seinen Kampf, auf eine Figur und auf seinen Initiativwurf — alle drei stehen weiter oben.
  "kaempfe", "kampf_teilnehmer",
  // Die Erleichterung zeigt auf Figur, Gewaehrende und den einloesenden Wurf; alle drei stehen
  // weiter oben.
  "erleichterungen",
  // Zuletzt das Geld: die Einheit gehoert der Kampagne, die Boerse einer Figur — beide
  // stehen weiter oben.
  "geld_einheit", "geldbestand",
];

export class CampaignRestoreError extends Error {
  constructor(message: string) { super(message); this.name = "CampaignRestoreError"; }
}
export interface CampaignRestoreReport {
  campaignId: string; universeId: string; contentHash: string; rows: number;
  identitiesWithoutCredentials: number; enrollmentRequired: true; dryRun: boolean;
  formatVersion: 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13; migration?: CampaignMigrationChain;
}
export interface CampaignMigrationChain {
  sourceVersion: 1 | 2 | 3 | 4; targetVersion: 4 | 5; sourceContentHash: string; targetContentHash: string;
  steps: readonly (CampaignUpgradeReport | CampaignUpgradeReportV2ToV3 | CampaignUpgradeReportV3ToV4 | CampaignUpgradeReportV4ToV5)[]; reportHash: string;
}
function migrationChain(steps: CampaignMigrationChain["steps"]): CampaignMigrationChain {
  const value = { sourceVersion: steps[0]!.sourceVersion, targetVersion: steps[steps.length - 1]!.targetVersion as 4 | 5,
    sourceContentHash: steps[0]!.sourceContentHash, targetContentHash: steps[steps.length - 1]!.targetContentHash, steps };
  return { ...value, reportHash: canonicalHash(value as unknown as CanonicalValue) };
}
function report(bundle: CampaignBundle, dryRun: boolean, migration?: CampaignMigrationChain): CampaignRestoreReport {
  const tables = currentCampaignTables(bundle);
  return { campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId,
    contentHash: bundle.manifest.contentHash, rows: CAMPAIGN_TABLES.reduce((sum, table) => sum + tables[table.name].length, 0),
    identitiesWithoutCredentials: bundle.tables.users.length, enrollmentRequired: true, dryRun, formatVersion: bundle.version,
    ...(migration ? { migration } : {}) };
}
export interface CampaignRestoreOptions { upgradeFromV1?: boolean; upgradeFromV2?: boolean; upgradeFromV3?: boolean; upgradeFromV4?: boolean }
function restoreInput(input: unknown, options: CampaignRestoreOptions): { bundle: CampaignBundle; migration?: CampaignMigrationChain } {
  if ([options.upgradeFromV1, options.upgradeFromV2, options.upgradeFromV3, options.upgradeFromV4].filter(Boolean).length > 1) throw new CampaignRestoreError("Select exactly one explicit source-version upgrade option.");
  const version = input && typeof input === "object" ? Object.getOwnPropertyDescriptor(input, "version")?.value : undefined;
  if (options.upgradeFromV1 && version !== 1) throw new CampaignRestoreError("--upgrade-from-v1 requires a version 1 source file.");
  if (options.upgradeFromV2 && version !== 2) throw new CampaignRestoreError("--upgrade-from-v2 requires a version 2 source file.");
  if (options.upgradeFromV3 && version !== 3) throw new CampaignRestoreError("--upgrade-from-v3 requires a version 3 source file.");
  if (options.upgradeFromV4 && version !== 4) throw new CampaignRestoreError("--upgrade-from-v4 requires a version 4 source file.");
  if (options.upgradeFromV4) {
    const upgraded = upgradeCampaignBundleV4(input);
    return { bundle: upgraded.bundle, migration: migrationChain([upgraded.report]) };
  }
  if (version === 1) {
    if (!options.upgradeFromV1) throw new CampaignRestoreError("Native campaign v1 requires the explicit --upgrade-from-v1 option for this v4 destination.");
    const first = upgradeCampaignBundleV1(input), second = upgradeCampaignBundleV2(first.bundle), third = upgradeCampaignBundleV3(second.bundle);
    return { bundle: validateCampaignBundle(third.bundle), migration: migrationChain([first.report, second.report, third.report]) };
  }
  if (version === 2) {
    if (!options.upgradeFromV2) throw new CampaignRestoreError("Native campaign v2 requires the explicit --upgrade-from-v2 option for this v4 destination.");
    const first = upgradeCampaignBundleV2(input), second = upgradeCampaignBundleV3(first.bundle);
    return { bundle: validateCampaignBundle(second.bundle), migration: migrationChain([first.report, second.report]) };
  }
  if (version === 3) {
    if (!options.upgradeFromV3) throw new CampaignRestoreError("Native campaign v3 requires the explicit --upgrade-from-v3 option for this v4 destination.");
    const upgraded = upgradeCampaignBundleV3(input);
    return { bundle: validateCampaignBundle(upgraded.bundle), migration: migrationChain([upgraded.report]) };
  }
  return { bundle: validateCampaignBundle(input) };
}

/** A complete profile must account for every durable column in its source schema. */
async function requireCoveredSchema(tx: Db): Promise<void> {
  const columns = (await tx.query<{ table_name: string; column_name: string | null }>(`
    SELECT c.relname AS table_name,a.attname AS column_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    WHERE n.nspname=current_schema() AND c.relkind IN ('r','p')`)).rows;
  const present = new Map<string, Set<string>>();
  const incompatible = () => new CampaignRestoreError("Application schema is not covered by native campaign v4/v5/v6/v7; an explicit format migration is required.");
  for (const { table_name, column_name } of columns) {
    if (excludedTables.has(table_name)) continue;
    const allowed = coveredColumns.get(table_name);
    if (!allowed || column_name === null || !allowed.has(column_name)) throw incompatible();
    const found = present.get(table_name) ?? new Set<string>();
    found.add(column_name); present.set(table_name, found);
  }
  for (const [table, expected] of coveredColumns)
    if ([...expected].some(column => !present.get(table)?.has(column))) throw incompatible();
}

async function collect(tx: Db, campaignId: string, universeId: string, exportedAt: string): Promise<CampaignBundle> {
  await requireCoveredSchema(tx);
  const tables = {} as Record<CampaignTableName, CampaignRow[]>;
  for (const table of CAMPAIGN_TABLES) {
    if (table.name === "users") continue;
    let where: string, params: unknown[] = [campaignId];
    switch (table.name) {
      case "campaigns": where = "id=$1"; break;
      case "universes": where = "id=$1"; params = [universeId]; break;
      case "universe_memberships": where = "universe_id=$1"; params = [universeId]; break;
      case "revisions": case "lineage_events": where = "entry_id IN (SELECT id FROM entries WHERE campaign_id=$1)"; break;
      case "import_acceptances": where = "artifact_id IN (SELECT id FROM artifacts WHERE campaign_id=$1)"; break;
      case "campaign_messages": where = "campaign_id=$1 AND kind='letter'"; break;
      case "audit": {
        const kinds = (table.fields.kind!.values ?? []) as readonly string[];
        where = "campaign_id=$1 AND kind=ANY($2::text[])"; params.push(kinds); break;
      }
      default: where = "campaign_id=$1";
    }
    const columns = table.columns.map(column => table.bigintColumns.includes(column) ? `${quoted(column)}::text AS ${quoted(column)}` : quoted(column));
    tables[table.name] = (await tx.query<CampaignRow>(`SELECT ${columns.join(",")} FROM ${quoted(table.name)} WHERE ${where}`, params)).rows;
  }
  const users = new Set<string>();
  for (const rows of Object.values(tables)) for (const row of rows) for (const [key, value] of Object.entries(row))
    if (identityColumns.has(key) && typeof value === "string") users.add(value);
  tables.users = (await tx.query<CampaignRow>('SELECT id,display_name,created_at::text AS created_at FROM users WHERE id=ANY($1::text[])', [[...users]])).rows;
  return createCampaignBundle({ campaignId, universeId, exportedAt, tables: tables as CampaignTables });
}

/** Authenticated GM export: every row comes from one repeatable-read snapshot. */
export async function exportCampaignBundle(db: Db, userId: string, campaignId: string, options: { now?: () => number } = {}): Promise<CampaignBundle> {
  try {
    return await db.transaction(async tx => {
      await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      const admitted = await tx.query("SELECT campaign_id FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2 AND role='leitung' FOR SHARE", [campaignId, userId]);
      if (!admitted.rowCount) throw new Gone("membership");
      const member = await createCampaigns(tx).requireMember(userId, campaignId, ["leitung"]);
      return collect(tx, campaignId, member.universeId, new Date((options.now ?? Date.now)()).toISOString());
    });
  } catch (error) {
    if ((error as { code?: string }).code === "40001") throw new Conflict();
    throw error;
  }
}

async function requireSchema(tx: Db): Promise<void> {
  if (!(await tx.query("SELECT name FROM schema_migrations WHERE name=$1", [MIGRATION])).rowCount)
    throw new CampaignRestoreError("Destination requires migration 014; initialize the empty destination explicitly first.");
  await requireCoveredSchema(tx);
}
async function requireEmpty(tx: Db, allowMissing = false): Promise<void> {
  const known = new Set<string>([...destinationTables, "schema_migrations"]);
  const present = (await tx.query<{ relname: string }>(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=current_schema() AND c.relkind IN ('r','p')`)).rows.map(row => row.relname);
  if (present.some(name => !known.has(name))) throw new CampaignRestoreError("Destination schema contains tables outside the supported empty application schema.");
  for (const name of destinationTables) {
    if (!present.includes(name)) {
      if (allowMissing) continue;
      throw new CampaignRestoreError("Destination schema is incomplete; initialize it explicitly first.");
    }
    if ((await tx.query(`SELECT 1 FROM ${quoted(name)} LIMIT 1`)).rowCount)
      throw new CampaignRestoreError(`Destination must be empty; ${name} already contains data. Existing identities are never reused.`);
  }
}

/** Explicit administrator schema creation, also refused when any application data exists. */
export async function initializeCampaignRestoreTarget(db: Db): Promise<void> {
  await db.transaction(async tx => {
    await tx.query("SELECT pg_advisory_xact_lock(7342619)");
    const existing = (await tx.query<{ relname: string }>(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=current_schema() AND c.relkind IN ('r','p')`)).rows.map(row => row.relname);
    const lockable = destinationTables.filter(name => existing.includes(name));
    if (lockable.length) await tx.query(`LOCK TABLE ${lockable.map(quoted).join(",")} IN ACCESS EXCLUSIVE MODE`);
    await requireEmpty(tx, true);
    await migrate(tx);
  });
}

/** Reads and validates only. No migration, writes, sequence changes or enrollment occur. */
export async function inspectCampaignRestore(db: Db, input: unknown, options: CampaignRestoreOptions = {}): Promise<CampaignRestoreReport> {
  const { bundle, migration } = restoreInput(input, options);
  return db.transaction(async tx => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await requireSchema(tx); await requireEmpty(tx);
    return report(bundle, true, migration);
  });
}

/** Administrator-only construction into an empty target. Never expose as an HTTP route. */
export async function restoreCampaignBundle(db: Db, input: unknown, options: CampaignRestoreOptions = {}): Promise<CampaignRestoreReport> {
  const { bundle, migration } = restoreInput(input, options);
  const tables = currentCampaignTables(bundle);
  return db.transaction(async tx => {
    await tx.query("SELECT pg_advisory_xact_lock(7342619)");
    await requireSchema(tx);
    // Also excludes ordinary application writers that do not use the restore advisory lock.
    await tx.query(`LOCK TABLE ${destinationTables.map(quoted).join(",")} IN ACCESS EXCLUSIVE MODE`);
    await requireEmpty(tx);
    await tx.query("SET CONSTRAINTS ALL DEFERRED");
    await tx.query("SET LOCAL chronicle.restore = 'on'");
    for (const name of restoreOrder) {
      const table = CAMPAIGN_TABLES.find(item => item.name === name)!;
      const rows = tables[name];
      if (!rows.length) continue;
      const columns = table.columns.map(quoted).join(",");
      // A single typed recordset supports intra-table parent references without unsafe
      // identifier interpolation or PostgreSQL's parameter-count ceiling.
      await tx.query(`INSERT INTO ${quoted(name)} (${columns}) OVERRIDING SYSTEM VALUE
        SELECT ${columns} FROM jsonb_populate_recordset(NULL::${quoted(name)},$1::jsonb)`, [JSON.stringify(rows)]);
    }
    await tx.query("SET CONSTRAINTS ALL IMMEDIATE");
    const reopened = await collect(tx, bundle.manifest.campaignId, bundle.manifest.universeId, bundle.manifest.exportedAt);
    if (campaignSemanticDiff(bundle, reopened).length) throw new CampaignRestoreError("Restored campaign differs from the supplied evidence; the transaction was rolled back.");
    // ALTER IDENTITY RESTART is transactional, unlike setval. A failed restore
    // therefore cannot advance destination identity sequences outside its rollback.
    for (const [name, column] of [["lineage_events", "seq"], ["audit", "id"], ["access_incidents", "id"]] as const) {
      const maximum = bundle.tables[name].reduce((max, row) => { const value = BigInt(String(row[column])); return value > max ? value : max; }, 0n);
      if (maximum >= 9223372036854775807n) throw new CampaignRestoreError("An identity sequence is exhausted.");
      await tx.query(`ALTER TABLE ${quoted(name)} ALTER COLUMN ${quoted(column)} RESTART WITH ${maximum + 1n}`);
    }
    return report(bundle, false, migration);
  });
}

/** Separate, explicit local-administrator enrollment. Bundle data never invokes it. */
export async function enrollRestoredCampaignGm(db: Db, campaignId: string, userId: string, config: IdentityConfig) {
  if (!campaignId || !userId) throw new CampaignRestoreError("Enrollment requires an explicitly selected campaign and historical GM identity.");
  return db.transaction(async tx => {
    // Serialize with initial setup so it cannot invent another owner while the
    // chosen restored GM is being enrolled.
    await tx.query("SELECT pg_advisory_xact_lock(7342620)");
    const selected = await tx.query(`SELECT u.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      JOIN users u ON u.id=m.user_id WHERE c.id=$1 AND u.id=$2 AND m.role='leitung'
      FOR UPDATE OF c,u FOR SHARE OF m`, [campaignId, userId]);
    if (!selected.rowCount) throw new CampaignRestoreError("The selected identity is not an existing GM member of this campaign.");
    const identity = createIdentity(tx, config);
    await tx.query("UPDATE users SET platform_role='leitung' WHERE id=$1", [userId]);
    // No credential exists until the browser redeems this one-use ten-minute code.
    const pairing = await identity.mintPairing(userId, campaignId, userId);
    return { campaignId, userId, ...pairing };
  });
}
