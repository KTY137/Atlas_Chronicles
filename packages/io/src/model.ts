import type { CampaignId, EntryId, ImportId, PassageId, UniverseId } from "@chronicle/core";
import type { Alias, Entry, EntryArt, ImportBericht, ImportHerkunft, Link, Passage, Revision, RoterLink } from "@chronicle/chronik";

export interface EronArticle {
  readonly title: string;
  readonly pageid: number;
  readonly ns: number;
  readonly revid: number;
  readonly wikitext: string;
}

export interface EronTemplate {
  readonly title: string;
  readonly source: string;
}

/** Supplied from the complete revision history, never from the export's last editor. */
export interface EronAttribution {
  readonly complete: true;
  readonly authors: readonly string[];
  readonly anonymousContributions: number;
  readonly revisionSha1: string;
}

/** Missing evidence stays explicit; it is not a fictional complete ImportHerkunft. */
export type ImportProvenance =
  | { readonly status: "complete"; readonly value: ImportHerkunft }
  | {
      readonly status: "incomplete";
      readonly value: Omit<ImportHerkunft, "autoren" | "anonymeBeitraege" | "quellSha1">;
      readonly missing: readonly ["complete-author-history", "revision-sha1"];
    };

export interface EronImportInput {
  /** Unknown because the adapter is also the JSON upload boundary. */
  readonly articles: unknown;
  readonly templates: unknown;
  readonly universeId: UniverseId;
  readonly campaignId?: CampaignId;
  readonly wikiUrl: string;
  /** Explicit time is required: the importer never reads the wall clock. */
  readonly importiertAm: string;
  readonly license?: string;
  /**
   * Absent and `undefined` mean the same thing here — attribution could not be resolved, so the
   * import is marked incomplete either way. `exactOptionalPropertyTypes` is on repo-wide and
   * earns its keep on fields where the distinction is real (a link's `zielEntryId` is either a
   * resolved id or an open door, and those are different facts). It buys nothing on an optional
   * *input* that callers assemble conditionally, so the union is widened deliberately rather
   * than every call site being forced to omit the key.
   */
  readonly attributionByPageId?: Readonly<Record<string, EronAttribution>> | undefined;
  readonly templateTypes?: Readonly<Record<string, EntryArt>>;
  readonly minimumParagraphLength?: number;
  /** Editable corpus-specific policy, evaluated only against unresolved links. */
  readonly rejectLinkTarget?: (slug: string) => boolean;
}

export interface EronSource {
  readonly format: "eron-json";
  readonly sha256: string;
  readonly wikiUrl: string;
  /** Original JSON values, including adapter-unknown fields; source is recoverable. */
  readonly articles: unknown;
  readonly templates: unknown;
}

export interface ImportedMediaReference {
  readonly pageid: number;
  readonly fileName: string;
  readonly source: string;
  readonly licenseStatus: "unbekannt";
  readonly state: "source-only";
}

export interface EronImportResult {
  readonly importerVersion: "1";
  readonly importId: ImportId;
  readonly universeId: UniverseId;
  readonly campaignId?: CampaignId;
  readonly entries: readonly Entry[];
  readonly revisions: readonly Revision[];
  readonly passages: readonly Passage[];
  readonly aliases: readonly Alias[];
  readonly links: readonly Link[];
  readonly redLinks: readonly RoterLink[];
  readonly provenance: readonly ImportProvenance[];
  readonly media: readonly ImportedMediaReference[];
  readonly source: EronSource;
  readonly report: ImportBericht;
  /** True until a person accepts import/reimport; missing attribution remains a separate issue. */
  readonly reviewRequired: true;
  readonly attributionComplete: boolean;
}

export interface EronReimportPlan {
  readonly unchanged: readonly { readonly existingPassageId: PassageId; readonly candidatePassageId: PassageId }[];
  readonly additions: readonly Passage[];
  /** Historical passages stay addressable. This is a review list, never a delete command. */
  readonly removalCandidates: readonly Passage[];
  readonly entryChanges: readonly EntryId[];
  readonly reviewRequired: true;
}
