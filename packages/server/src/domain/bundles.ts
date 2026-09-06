import {
  CAMPAIGN_TABLES, CAMPAIGN_EXCLUDED_TABLES, createCampaignBundle, validateCampaignBundle, campaignSemanticDiff,
  type CampaignBundle, type CampaignRow, type CampaignTables, type CampaignTableName,
} from "@chronicle/io";
import { migrate, type Db } from "../db/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { Conflict, Gone } from "./errors.ts";

const MIGRATION = "009_campaign_restore.sql";
const identityColumns = new Set(["owner_user_id", "user_id", "created_by", "author_user_id", "issued_by", "granted_by", "prepared_by", "installed_by", "started_by", "updated_by", "sent_by", "reader_user_id", "actor_user_id", "accepted_by"]);
const destinationTables = [...CAMPAIGN_TABLES.map(table => table.name), ...CAMPAIGN_EXCLUDED_TABLES.filter(name => name !== "schema_migrations")];
const excludedTables = new Set<string>(CAMPAIGN_EXCLUDED_TABLES);
const coveredColumns = new Map<string, ReadonlySet<string>>(CAMPAIGN_TABLES.map(table => [table.name,
  new Set([...table.columns, ...(table.name === "users" ? ["platform_role"] : [])]),
]));
// These identifiers come exclusively from the compiled format metadata above.
const quoted = (name: string) => `"${name}"`;
const restoreOrder: readonly CampaignTableName[] = [
  "users", "universes", "campaigns", "actors", "campaign_memberships", "universe_memberships",
  "entries", "revisions", "passages", "artifacts", "lineage_events", "entry_aliases", "import_acceptances",
  "vollmachten", "rolls", "revelations", "rule_packages", "campaign_rule_pins", "actor_sheets", "scenes",
  "week_baselines", "game_sessions", "action_vollmachten", "action_rolls", "confirmed_mints", "week_clocks",
  "letters", "letter_recipients", "letter_delivery_receipts", "reading_watermarks",
  "atlas_maps", "atlas_nodes", "atlas_revelations", "campaign_messages", "audit", "access_incidents",
];

export class CampaignRestoreError extends Error {
  constructor(message: string) { super(message); this.name = "CampaignRestoreError"; }
}
export interface CampaignRestoreReport {
  campaignId: string; universeId: string; contentHash: string; rows: number;
  identitiesWithoutCredentials: number; enrollmentRequired: true; dryRun: boolean;
}
function report(bundle: CampaignBundle, dryRun: boolean): CampaignRestoreReport {
  return { campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId,
    contentHash: bundle.manifest.contentHash, rows: CAMPAIGN_TABLES.reduce((sum, table) => sum + bundle.tables[table.name].length, 0),
    identitiesWithoutCredentials: bundle.tables.users.length, enrollmentRequired: true, dryRun };
}

/** A complete profile must account for every durable column in its source schema. */
async function requireCoveredSchema(tx: Db): Promise<void> {
  const columns = (await tx.query<{ table_name: string; column_name: string | null }>(`
    SELECT c.relname AS table_name,a.attname AS column_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    WHERE n.nspname=current_schema() AND c.relkind IN ('r','p')`)).rows;
  const present = new Map<string, Set<string>>();
  const incompatible = () => new CampaignRestoreError("Application schema is not covered by native campaign v1; an explicit format migration is required.");
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
    throw new CampaignRestoreError("Destination requires migration 009; initialize the empty destination explicitly first.");
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
export async function inspectCampaignRestore(db: Db, input: unknown): Promise<CampaignRestoreReport> {
  const bundle = validateCampaignBundle(input);
  return db.transaction(async tx => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await requireSchema(tx); await requireEmpty(tx);
    return report(bundle, true);
  });
}

/** Administrator-only construction into an empty target. Never expose as an HTTP route. */
export async function restoreCampaignBundle(db: Db, input: unknown): Promise<CampaignRestoreReport> {
  const bundle = validateCampaignBundle(input);
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
      const rows = bundle.tables[name];
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
    return report(bundle, false);
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
