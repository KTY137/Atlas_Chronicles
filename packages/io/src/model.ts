import type { CampaignId, EntryId, ImportId, PassageId, UniverseId } from "@chronicle/core";
import type { Alias, Asset, Entry, EntryArt, ImportBericht, ImportHerkunft, Link, LizenzStatus, Passage, Revision, RoterLink } from "@chronicle/chronik";

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
  /**
   * The source wiki's file inventory — metadata only, no bytes. Optional on purpose: an article
   * import must never wait on a media harvest, and a wiki that refuses `prop=imageinfo` must
   * still import. Without it every figure stays `referenziert`; with it the import can say who
   * uploaded a file, under which licence, and which of them nobody uses.
   */
  readonly media?: unknown;
}

/**
 * One row of `prop=imageinfo`, in the shape MediaWiki actually returns and the shape
 * `design/fixtures/eron/media.json` already has on disk. Every field is optional because a real
 * wiki fills almost none of them: on the Eron corpus **0 of 41 files carry a licence field**.
 */
export interface EronMediaFile {
  readonly title: string;
  readonly url?: string;
  readonly descriptionurl?: string;
  readonly mime?: string;
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  readonly uploader?: string;
  readonly uploaded_at?: string;
  readonly categories?: readonly string[];
  readonly licence?: Readonly<Record<string, string | null>>;
  readonly description_page_wikitext?: string;
  readonly used_by_articles?: readonly string[];
}

export interface EronSource {
  readonly format: "eron-json";
  readonly sha256: string;
  readonly wikiUrl: string;
  /** Original JSON values, including adapter-unknown fields; source is recoverable. */
  readonly articles: unknown;
  readonly templates: unknown;
}

/**
 * One article's reference to one file. This is the demand side; `Asset` is the supply side, and
 * they are deliberately separate records: an article import resolves in seconds, a media harvest
 * is a hundred CDN round trips, and forcing the first to wait on the second is why importers
 * feel like they hang.
 */
export interface ImportedMediaReference {
  readonly pageid: number;
  /** Normalised file name — the identity `Asset` and `bildunterschrift.assetId` are derived from. */
  readonly fileName: string;
  /** The original markup, retained verbatim. */
  readonly source: string;
  readonly licenseStatus: LizenzStatus;
  /**
   * `referenziert` — an article points at the file and nothing else is known.
   * `beschrieben` — the wiki's file inventory answered: URL, uploader, claimed type, licence.
   * The third state, bytes present and measured, is an `Asset`; it is not spelled here, because
   * a reference must never be able to claim a file exists locally when it does not.
   */
  readonly state: "referenziert" | "beschrieben";
  readonly assetId?: string;
  readonly beschreibungsseiteUrl?: string;
  /** Where the bytes may be fetched from. Provenance and a to-do list, never a live dependency. */
  readonly quellUrl?: string;
  readonly urheber?: string;
  /** The type the source wiki CLAIMS. It is checked against the bytes, never trusted. */
  readonly behaupteterMime?: string;
}

/**
 * An asset as the import knows it: identity, provenance and a licence verdict, with `mime` and
 * `sha256` still absent because no byte has been fetched. The extra fields here are import
 * bookkeeping — what the source claimed, who uses the file, whether anyone does.
 */
export interface EronAssetEntwurf extends Asset {
  /** The import always states these three, so nothing downstream has to guess at a default. */
  readonly verwendetVon: readonly string[];
  readonly verwaist: boolean;
  readonly imBestand: boolean;
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
  /**
   * Die Kategorien, die das Quellwiki über `[[Kategorie:X]]` behauptet — je Eintrag entfaltet
   * und je Eintrag entdoppelt. Sie sind bewusst KEINE Links: ein Kategorie-Link ist keine Tür
   * und kein Rotlink (siehe `namespaceLinkTarget`), sondern eine Klassifikation.
   */
  readonly kategorien: readonly { readonly entryId: EntryId; readonly name: string; readonly slug: string }[];
  /**
   * Files the source inventory describes, as asset records WITHOUT bytes. The bytes arrive
   * through a separate, resumable upload; until then `Asset.sha256` is absent and every reader
   * shows a named placeholder rather than a hole.
   */
  readonly assets: readonly EronAssetEntwurf[];
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
