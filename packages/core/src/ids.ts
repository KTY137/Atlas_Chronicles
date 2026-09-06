import { canonicalHash } from "./canonical.ts";

/**
 * Branded ids.
 *
 * Invariant I8 (design/research/RB-20:311, design/research/RB-21d-erzeugung-je-ebene.md:651):
 * an id is `hash(seed, generator_version, kind, path)` — NEVER an array index. FMG's own ids
 * *are* array indices, and the measurement is brutal: same seed, canvas 1280x720 -> 1600x900
 * keeps `(id, name)` for **0 of 664 burgs** (RB-21d:234). An index is not an identity; it is a
 * lottery ticket that prints the same number twice if you hold the machine perfectly still.
 *
 * Branding is structural-typing defence: `EntryId` and `PassageId` are both strings at runtime
 * and must never be assignable to each other. The corpus's own scar is the same shape —
 * `Ort` shares `Entry.id` precisely because two ids became two names became three identities
 * for one polity in the real Eron corpus (RB-21:286-296).
 */
declare const BRAND: unique symbol;
type Brand<T extends string> = { readonly [BRAND]: T };

export type EntryId = string & Brand<"EntryId">;
export type PassageId = string & Brand<"PassageId">;
export type RevisionId = string & Brand<"RevisionId">;
export type KnotenId = string & Brand<"KnotenId">;
export type UniverseId = string & Brand<"UniverseId">;
export type CampaignId = string & Brand<"CampaignId">;
export type GameSessionId = string & Brand<"GameSessionId">;
export type ActorId = string & Brand<"ActorId">;
export type UserId = string & Brand<"UserId">;
export type ImportId = string & Brand<"ImportId">;
export type AssetId = string & Brand<"AssetId">;

/**
 * The id kinds a derived id may carry. Closed on purpose: a new kind is a deliberate
 * schema act, not an incidental string.
 */
export type IdKind =
  | "entry"
  | "passage"
  | "revision"
  | "knoten"
  | "asset"
  | "import";

export interface DerivedIdInput {
  /** The generator or importer that produced this thing, e.g. "azgaar-fmg", "mediawiki-xml". */
  readonly erzeuger: string;
  /** Its pinned version. A bump is a migration, not an upgrade (RB-21d:240). */
  readonly version: string;
  /** The seed or source digest the derivation started from. */
  readonly keim: string;
  readonly kind: IdKind;
  /**
   * The stable path to this thing *within* that derivation — e.g. `["burg", "Rendale"]`.
   * Must not contain an array index unless the index is itself stable across regeneration,
   * which for FMG it is not.
   */
  readonly pfad: readonly string[];
}

/**
 * Mint a derived id. Deterministic: identical input yields an identical id on every platform,
 * which is what makes gate K-G2 (`S-G1 · Der Keim`, id stability across two exports of one
 * seed) checkable at all.
 */
export function deriveId(input: DerivedIdInput): string {
  return canonicalHash({
    erzeuger: input.erzeuger,
    version: input.version,
    keim: input.keim,
    kind: input.kind,
    pfad: [...input.pfad],
  }).slice(0, 32);
}

export const deriveKnotenId = (i: DerivedIdInput & { kind: "knoten" }): KnotenId =>
  deriveId(i) as KnotenId;
export const deriveEntryId = (i: DerivedIdInput & { kind: "entry" }): EntryId =>
  deriveId(i) as EntryId;
export const derivePassageId = (i: DerivedIdInput & { kind: "passage" }): PassageId =>
  deriveId(i) as PassageId;
export const deriveAssetId = (i: DerivedIdInput & { kind: "asset" }): AssetId =>
  deriveId(i) as AssetId;

/**
 * Unsafe casts, for adapters that receive an id from storage or a fixture. Named `trust*`
 * so that every place we take a string's word for it is greppable.
 */
export const trustEntryId = (s: string): EntryId => s as EntryId;
export const trustPassageId = (s: string): PassageId => s as PassageId;
export const trustRevisionId = (s: string): RevisionId => s as RevisionId;
export const trustKnotenId = (s: string): KnotenId => s as KnotenId;
export const trustUniverseId = (s: string): UniverseId => s as UniverseId;
export const trustCampaignId = (s: string): CampaignId => s as CampaignId;
export const trustActorId = (s: string): ActorId => s as ActorId;
export const trustUserId = (s: string): UserId => s as UserId;
export const trustAssetId = (s: string): AssetId => s as AssetId;
export const trustImportId = (s: string): ImportId => s as ImportId;
