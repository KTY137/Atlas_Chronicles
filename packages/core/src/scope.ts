import type { ActorId, CampaignId, GameSessionId, UniverseId, UserId } from "./ids.ts";

/**
 * `ScopeRef` — where a thing lives. Universe is mandatory, campaign is optional, session is
 * narrower still (design/06-giga-product-architecture.md:2929).
 *
 * `CHECK (universe_id IS NOT NULL)` is a database constraint, not a convention
 * (design/02-domain-model.md:121-124): *both empty is invalid* must be unrepresentable rather
 * than merely discouraged. The type mirrors the constraint so the two cannot drift.
 */
export interface ScopeRef {
  readonly universeId: UniverseId;
  readonly campaignId?: CampaignId;
  readonly gameSessionId?: GameSessionId;
}

/**
 * `AuthSession` is not `GameSession` is not `TransportRoom`
 * (design/06-giga-product-architecture.md:2964-2968; design/02-domain-model.md:55-57).
 * Binding naming discipline from day one — it prevents a whole class of bugs, and this file
 * is where the three are kept apart.
 */
export type UniverseRole = "besitzer" | "verwalter" | "autor" | "leser";
export type CampaignRole = "leitung" | "spieler" | "beobachter";

export interface UniverseMembership {
  readonly universeId: UniverseId;
  readonly userId: UserId;
  readonly rolle: UniverseRole;
}

export interface CampaignMembership {
  readonly campaignId: CampaignId;
  readonly userId: UserId;
  readonly rolle: CampaignRole;
}

/**
 * The viewer, as `Sicht` consumes it (design/06-giga-product-architecture.md:1241-1247).
 *
 * Note what is absent and must stay absent: any field describing *what the viewer may not
 * see*. Grenze B9. The viewer context carries identity and membership; the projector derives
 * everything else. A `hiddenCount` here would be a leak with a nice name.
 */
export interface ViewerContext {
  readonly userId?: UserId;
  readonly universe?: UniverseMembership;
  readonly campaign?: CampaignMembership;
  /** The character this viewer is acting as. Absent for a GM reading as herself, or a guest. */
  readonly actingActorId?: ActorId;
  /** Characters this user controls. A GM may control none and still be leitung. */
  readonly controlledActorIds: readonly ActorId[];
  /** True for the unauthenticated public reader — `die offene Tür`. */
  readonly oeffentlich: boolean;
}

export const gastSicht = (): ViewerContext => ({ controlledActorIds: [], oeffentlich: true });

export const istLeitung = (v: ViewerContext): boolean => v.campaign?.rolle === "leitung";

/**
 * `Ortswissen` — the spatial knowledge ternary. **Closed.**
 * design/06-giga-product-architecture.md:1270: *"UI-Synonyme dürfen keine vierte Stufe
 * erfinden."* A fourth level is not a feature request; it is a leak with a label.
 */
export type Ortswissen = "unbekannt" | "benannt" | "erschlossen";

export const ORTSWISSEN: readonly Ortswissen[] = ["unbekannt", "benannt", "erschlossen"] as const;

/** Monotone join: knowledge accumulates, it never decreases through composition. */
export function hoeheresOrtswissen(a: Ortswissen, b: Ortswissen): Ortswissen {
  const rank: Record<Ortswissen, number> = { unbekannt: 0, benannt: 1, erschlossen: 2 };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * The three truth classes (design/06-giga-product-architecture.md:1174-1198). Orthogonal to
 * `PublicationState` and to viewer projection: a GM secret can be KANON although unpublished
 * and projected for no player character.
 */
export type Wahrheitsklasse = "kanon" | "plan" | "runtime";

/** design/iterations/round-01/product-A.md:398-400 */
export type Kanonstatus = "kanon" | "geruecht" | "apokryph" | "abgeloest";

export type PublicationState = "privat" | "explizit_oeffentlich";

/**
 * Optimistic concurrency. Clients send semantic commands with expected versions; the server
 * checks preconditions and returns authoritative state (06:2925-2960). Identity is taken from
 * the transport context and never from a payload field (06:2957-2960) — which is why there is
 * no `userId` in this envelope and adding one would be a security regression.
 */
export interface VersionPrecondition {
  readonly objectId: string;
  readonly expectedVersion: number;
}

export interface CommandEnvelope<T> {
  readonly commandId: string;
  readonly scope: ScopeRef;
  readonly expectedVersions: readonly VersionPrecondition[];
  readonly issuedAtClient: string;
  readonly payload: T;
}
