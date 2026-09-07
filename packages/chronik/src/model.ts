import type {
  ActorId,
  AssetId,
  CampaignId,
  EntryId,
  ImportId,
  Kanonstatus,
  PassageId,
  RevisionId,
  UniverseId,
  UserId,
} from "@chronicle/core";

/**
 * THE IRREVERSIBLE LAYER — the atom of knowledge.
 *
 * Kaya's migration rule (CLAUDE.md, 2026-07-27): the data model, the permission model, the
 * atom of knowledge and every import/export format are built maximal *first*, because a cheap
 * version here is not a saving but a debt with compound interest paid in migration. Round 4's
 * fatal break was exactly this shape.
 *
 * Everything in this file is a shape, not a behaviour. Behaviour lives in siblings so that
 * the contract can be read in one sitting.
 */

// ---------------------------------------------------------------------------------------
// Entry — der Eintrag als Substrat
// ---------------------------------------------------------------------------------------

/**
 * Every durable object gets an `Entry` row; domain tables are extensions keyed by `entry_id`
 * (design/iterations/round-01/product-A.md:384-397). One identity for links, ONE backlink
 * index, ONE search index, ONE permission predicate, ONE revision mechanism. "Refusing it
 * means writing all five, five times."
 *
 * `universeId` is non-optional here because `CHECK (universe_id IS NOT NULL)` is a database
 * constraint, not a convention (design/02-domain-model.md:121-124).
 */
export interface Entry {
  readonly id: EntryId;
  readonly universeId: UniverseId;
  /** Campaign-local extension. Never mutates the universe entry — additive, non-destructive. */
  readonly campaignId?: CampaignId;
  readonly parentEntryId?: EntryId;
  readonly slug: string;
  readonly titel: string;
  /** The type, derived from the author's own structure (the infobox template), not from tags. */
  readonly art: EntryArt;
  readonly kanonstatus: Kanonstatus;
  readonly abgeloestDurch?: EntryId;
  readonly aktuelleRevision: RevisionId;
  readonly erstelltVon?: UserId;
  /** Set only on imported entries; `undefined` for entries this product authored. */
  readonly anzeigename?: string;
  readonly sortierschluessel?: string;
}

/**
 * Open-ended by design: the type comes from the *user's* templates, mapped on the import
 * screen (RB-12:644-649). `sonstiges` is the honest bucket, never a silent default.
 */
export type EntryArt =
  | "charakter"
  | "organisation"
  | "spezies"
  | "gegenstand"
  | "ereignis"
  | "ort"
  | "regelseite"
  | "sonstiges";

export interface Revision {
  readonly id: RevisionId;
  readonly entryId: EntryId;
  readonly seq: number;
  readonly autorUserId?: UserId;
  readonly inhaltsHash: string;
}

/**
 * A redirect. **Never an `Entry`, never a door** (RB-12:235). Modelling it as an Entry would
 * put an empty article into the door count and inflate the one number the product sells.
 */
export interface Alias {
  readonly universeId: UniverseId;
  readonly vonSlug: string;
  readonly nachEntryId: EntryId;
}

// ---------------------------------------------------------------------------------------
// Passage — the atom
// ---------------------------------------------------------------------------------------

/**
 * `Passage.inhalt` is a **closed, versioned block AST. Never HTML, never Markdown at rest.
 * No `innerHTML` path in the article renderer** (design/iterations/round-02/product-A.md:486-492).
 * `der totale Renderer` lint rule enforces the second half; this type enforces the first.
 */
export const BLOCK_AST_VERSION = 1 as const;

export type InlineMark =
  | { readonly art: "em" }
  | { readonly art: "strong" }
  | { readonly art: "code" }
  /** An internal link. `zielEntryId` absent => a red link => a door candidate. */
  | { readonly art: "link"; readonly zielSlug: string; readonly zielEntryId?: EntryId };

export interface InlineText {
  readonly text: string;
  readonly marks: readonly InlineMark[];
}

/**
 * The closed set of block kinds. A new constructor is a deliberate schema act; the projector
 * in `@chronicle/projection` is a total function over this union with **no default branch**,
 * so adding one without a projection rule is a compile error rather than a leak
 * (Default-Deny durch Totalität).
 */
export type Blockinhalt =
  /** A prose paragraph — the atom CHAMPION was designed around. */
  | { readonly kind: "absatz"; readonly inhalt: readonly InlineText[] }
  /**
   * One infobox row — `die geteilte Infobox`. Each row is its own passage with its own
   * provenance and its own revelation. In the real corpus this is the majority of all atoms.
   */
  | {
      readonly kind: "feld";
      readonly schluessel: string;
      readonly label: string;
      readonly gruppe?: string;
      /** Single-valued rows carry exactly one entry; bullet rows keep the order the author wrote. */
      readonly werte: readonly (readonly InlineText[])[];
      readonly mehrwertig: boolean;
      /**
       * An imported mechanical-looking field is NEVER automatically a clause (RB-12:661-669).
       * Import proposes; a human mints.
       */
      readonly klauselKandidat: boolean;
    }
  | { readonly kind: "liste"; readonly geordnet: boolean; readonly punkte: readonly (readonly InlineText[])[] }
  | { readonly kind: "zitat"; readonly inhalt: readonly InlineText[] }
  /**
   * A figure — the asset and the words under it are ONE passage, because a caption without its
   * image is not a citable statement about the world.
   *
   * Every added field is optional on purpose: a bundle written before images were imported
   * carries `{kind, assetId, inhalt}` and stays valid (the non-retroactivity promise,
   * design/06-giga-product-architecture.md §11.10).
   *
   * `dateiname` is carried IN the block, not only on the `Asset`, so that a reference whose
   * bytes were never fetched can still name itself honestly instead of rendering as a hole.
   * That is the normal state: article text and image bytes arrive in two separate steps.
   */
  | {
      readonly kind: "bildunterschrift";
      readonly assetId: AssetId;
      readonly inhalt: readonly InlineText[];
      readonly dateiname?: string;
      readonly alt?: string;
      readonly ausrichtung?: Bildausrichtung;
      /** Author-requested display width in px. A wish from the source, never a layout command. */
      readonly breite?: number;
      /** True when the reference came from an infobox `<image>` field — the portrait, not a body figure. */
      readonly ausInfobox?: boolean;
    }
  /**
   * Quarantine. RB-12 §2.8: rendered as monospaced source in a bordered card headed
   * „Aus dem Wiki übernommen — nicht umgewandelt", with a link to the source article.
   * It is a passage, it is citable, it is honest. **Never silently dropped** — a silently
   * dropped construct is a lie about completeness, and a silently promoted one is a lie
   * about authorship.
   */
  | { readonly kind: "rohblock"; readonly quelltext: string; readonly grund: RohblockGrund };

/** How the source asked for the figure to sit. Presentation, deliberately not layout authority. */
export type Bildausrichtung = "links" | "rechts" | "zentriert" | "ohne";

export type RohblockGrund =
  | "wikitabelle"
  | "unbekannte-vorlage"
  | "generator-prosa"
  | "sonstiges";

/** Authorship standing. Orthogonal to `belief` (GM truth) and `Haltung` (character confidence). */
export type Geltung = "notiz" | "antrag" | "kanon";

/**
 * How a passage became canon. **Closed set** — `Nichts wird automatisch Kanon`
 * (design/iterations/CHAMPION.md:505, :886-892). `null` is the import case and is deliberately
 * *not* a constructor here: an imported passage is not a `Quelle` at all, it is a passage with
 * `praegung = null` and an `ImportHerkunft` record (RB-12:285-293).
 */
export type Praegung =
  | { readonly art: "wurf"; readonly wurfId: string }
  | { readonly art: "gesprochen"; readonly sitzung: string }
  | { readonly art: "ratifikation"; readonly sitzung: string }
  | { readonly art: "berichtigung"; readonly ersetzt: PassageId }
  | { readonly art: "vollmacht"; readonly vollmachtId: string };

export interface Passage {
  readonly pid: PassageId;
  /** Bumped on every re-mint of the same logical atom; part of the lineage story. */
  readonly gen: number;
  readonly entryId: EntryId;
  readonly ord: number;
  /** The heading path this passage sits under. A heading is an ADDRESS, not a passage. */
  readonly pfad: readonly string[];
  readonly inhalt: Blockinhalt;
  readonly geltung: Geltung;
  /** `null` means imported — see `ImportHerkunft`. */
  readonly praegung: Praegung | null;
  readonly autorUserId?: UserId;
  readonly autorActorId?: ActorId;
  readonly erstelltInRevision: RevisionId;
  readonly zurueckgezogenInRevision?: RevisionId;
}

// ---------------------------------------------------------------------------------------
// Lineage — identity under editing
// ---------------------------------------------------------------------------------------

/**
 * Append-only. The runtime DB role holds `GRANT INSERT, SELECT` and nothing else
 * (round-02/product-A.md:494-500). The justification is a scar: a three-character
 * `AUDIT.splice` once inverted the domain model's one non-negotiable property and survived a
 * rebuild.
 *
 * `Revelation.passageId` may reference a retired pid; reads resolve THROUGH lineage and the
 * revelation is never rewritten — "rewriting history is what makes a *wrong* wiki."
 */
export type LineageEvent =
  | { readonly kind: "create"; readonly pid: PassageId }
  | { readonly kind: "revise"; readonly pid: PassageId }
  | { readonly kind: "retire"; readonly pid: PassageId }
  | { readonly kind: "split"; readonly parent: PassageId; readonly children: readonly PassageId[] }
  | { readonly kind: "merge"; readonly parents: readonly PassageId[]; readonly child: PassageId };

// ---------------------------------------------------------------------------------------
// Revelation — the grant edge
// ---------------------------------------------------------------------------------------

/**
 * "The single most important table in the product" (round-01/product-A.md:405-407).
 *
 * `quelle` is a **closed sum type with no fourth constructor, ever**
 * (design/iterations/CHAMPION.md:210-217). From it `erfahrungsgrad` is derived — *Erfahren
 * schlägt Gehört* — and that derivation is what prints `+2` to one character and
 * `-2 · nur gehört` to another off the same clause.
 */
export type Quelle =
  | { readonly art: "wurf"; readonly wurfId: string }
  | { readonly art: "gesprochen"; readonly sitzung: string }
  | { readonly art: "gehoert"; readonly von: ActorId }
  | { readonly art: "passage"; readonly ueber: PassageId };

export type Erfahrungsgrad = "erfahren" | "gesprochen" | "gehoert";

export interface Revelation {
  readonly passageId: PassageId;
  readonly actorId: ActorId;
  readonly quelle: Quelle;
  readonly gewaehrtIn?: string;
  readonly widerrufenAm?: string;
}

// ---------------------------------------------------------------------------------------
// Links — the door graph
// ---------------------------------------------------------------------------------------

/**
 * The link is anchored on the **passage**, not the article (round-05/product-B.md:672-674).
 * An unresolved row is a red link, and **a red link is a first-class prep artefact, not an
 * error** (round-01/product-A.md:403-405).
 */
export interface Link {
  readonly quellEntryId: EntryId;
  readonly quellPassageId: PassageId;
  readonly zielSlug: string;
  readonly zielEntryId?: EntryId;
}

/**
 * Door triage, computed at import, **no AI** (RB-12:754-759). The thresholds are demand
 * counts; the guard pattern is per-language and per-wiki and must be user-editable, because a
 * German notation abbreviation is not a place.
 */
export type Tuerklasse = "tuer" | "spur" | "notiz" | "verworfen";

export interface RoterLink {
  readonly zielSlug: string;
  /** Distinct source ENTRIES, not occurrences. */
  readonly eingehend: number;
  readonly klasse: Tuerklasse;
}

// ---------------------------------------------------------------------------------------
// Import provenance and licensing
// ---------------------------------------------------------------------------------------

/**
 * An imported passage is not a `Quelle`; it is `praegung = null` plus this record
 * (RB-12:285-310). Adding `Import` as a fourth `Quelle` "would put imported text on the same
 * footing as a die roll, which is the one thing this product exists to distinguish."
 *
 * Re-import identity is `(quellPageid, passageSha256)` — measured over 13 months of real
 * editing, content hash survives, ordinal position survives 0 % (RB-12:318-338).
 */
export interface ImportHerkunft {
  readonly passageId: PassageId;
  readonly importId: ImportId;
  readonly quellWikiUrl: string;
  readonly quellArtikelUrl: string;
  readonly quellPageid: number;
  readonly quellRevid: number;
  readonly quellSha1: string;
  readonly passageSha256: string;
  readonly pfad: readonly string[];
  readonly ordnung: number;
  readonly lizenz: string;
  /**
   * The real author set. The export's single last-editor field **is not the author list and
   * using it is a licence violation dressed as diligence** (RB-12:900-908).
   */
  readonly autoren: readonly string[];
  readonly anonymeBeitraege: number;
  readonly importiertAm: string;
}

/**
 * A file with an unknown licence is **imported, quarantined and visibly marked. It is never
 * refused and it is never treated as clean** (RB-12:855-886).
 */
export type LizenzStatus = "frei" | "zitat" | "unbekannt";

export interface Asset {
  readonly id: AssetId;
  readonly universeId: UniverseId;
  readonly dateiname: string;
  /**
   * Determined from MAGIC BYTES, never from the filename — Fandom's CDN transcodes to WebP
   * and serves it under the original `.jpg` name (fixtures/eron/media/LIESMICH.md).
   *
   * Present exactly when the bytes are: `mime` and `sha256` describe a file we hold, and an
   * asset whose bytes were never fetched must be able to exist without them. The alternative —
   * requiring them — would mean an article cannot be exported until every picture in it has been
   * downloaded, and would force a record to name a type nobody measured. Both fields are set or
   * neither is; the validators and the `wiki_assets` table both enforce that pairing.
   */
  readonly mime?: string;
  readonly sha256?: string;
  readonly lizenzStatus: LizenzStatus;
  readonly lizenzQuelle?: string;
  readonly lizenzGesetztVon: "import" | "mensch";
  readonly beschreibungsseiteUrl?: string;
  /** Measured from the decoded container, never copied from the source wiki's claim. */
  readonly breite?: number;
  readonly hoehe?: number;
  readonly bytes?: number;
  /** Who uploaded the file to the source wiki, when the source reported it. */
  readonly urheber?: string;
  readonly hochgeladenAm?: string;
  /** The delivered URL the bytes actually came from. Provenance, not a live dependency. */
  readonly quellUrl?: string;
  /**
   * What the source claimed the type was, kept beside the measured `mime` so the contradiction
   * stays visible. On the Eron corpus this differs for nearly every file: the wiki names them
   * `.jpg`, the CDN delivers WebP.
   */
  readonly behaupteterMime?: string;
  /** Titles in the source that use this file. Empty is not the same as unknown — see `verwaist`. */
  readonly verwendetVon?: readonly string[];
  /** The source says nothing uses it. Kept anyway; deleting someone's file is not ours to decide. */
  readonly verwaist?: boolean;
  /** The source's file inventory knows it. False means an article points at a picture that
   *  was never uploaded — a red link with an image tag. */
  readonly imBestand?: boolean;
}

/**
 * The import report is **a first-class artefact and it is a list of losses, not a success
 * banner** (RB-12:401). "Better than Fandom" starts by telling the truth about what did not
 * come across.
 */
export interface ImportBericht {
  readonly importId: ImportId;
  readonly quelle: string;
  readonly eintraege: number;
  readonly aliase: number;
  readonly passagen: number;
  readonly passagenNachArt: Readonly<Record<Blockinhalt["kind"], number>>;
  readonly blaueKanten: number;
  readonly roteKanten: number;
  readonly distinkteRoteZiele: number;
  readonly tuerbilanz: Readonly<Record<Tuerklasse, number>>;
  /** Every construct that did not survive, individually, with why. */
  readonly verluste: readonly Verlust[];
  /** Text conservation: concatenated passage plain text over source plain text. */
  readonly textErhaltung: number;
  readonly assetsNachLizenz: Readonly<Record<LizenzStatus, number>>;
}

export interface Verlust {
  readonly art:
    | "kurzer-absatz"
    | "unbenutzte-vorlage"
    | "modul"
    | "verworfenes-linkziel"
    | "verwaiste-datei"
    | "nicht-umgewandelt";
  readonly bezeichnung: string;
  readonly detail?: string;
}
