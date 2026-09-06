/**
 * `@chronicle/core` — the shared spine.
 *
 * May know: ids, versions, commands, generic relations, the closed enums every other package
 * projects through. May NOT know: concrete RPG rules, Pixi, permissions policy, storage.
 * (design/06-giga-product-architecture.md:2870-2882)
 *
 * `core` depends on nothing inside this repo. `tools/gate-boundaries.mjs` enforces that.
 */
export {
  canonicalJson,
  canonicalHash,
  textHash,
  NonCanonicalValueError,
  type CanonicalValue,
} from "./canonical.ts";

export {
  deriveId,
  deriveKnotenId,
  deriveEntryId,
  derivePassageId,
  deriveAssetId,
  trustEntryId,
  trustPassageId,
  trustRevisionId,
  trustKnotenId,
  trustUniverseId,
  trustCampaignId,
  trustActorId,
  trustUserId,
  trustAssetId,
  trustImportId,
  type DerivedIdInput,
  type IdKind,
  type EntryId,
  type PassageId,
  type RevisionId,
  type KnotenId,
  type UniverseId,
  type CampaignId,
  type GameSessionId,
  type ActorId,
  type UserId,
  type ImportId,
  type AssetId,
} from "./ids.ts";

export {
  nurLeitung,
  fuerLeitung,
  zaehleSichtbares,
  type NurLeitung,
  type GezaehltUeberSichtbares,
} from "./nurleitung.ts";

export {
  gastSicht,
  istLeitung,
  hoeheresOrtswissen,
  ORTSWISSEN,
  type ScopeRef,
  type ViewerContext,
  type UniverseMembership,
  type CampaignMembership,
  type UniverseRole,
  type CampaignRole,
  type Ortswissen,
  type Wahrheitsklasse,
  type Kanonstatus,
  type PublicationState,
  type VersionPrecondition,
  type CommandEnvelope,
} from "./scope.ts";
