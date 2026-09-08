// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export {
  AZGAAR_IMPORT_VERSION, MAX_AZGAAR_BYTES, AzgaarImportError, importiereAzgaar, azgaarImportAdapter,
  type AzgaarImport, type AzgaarZelle,
} from "./azgaar.ts";
export { ERON_MAP_IMPORT_VERSION, MAX_ERON_MAP_BYTES, EronMapImportError, importiereEronKarte } from "./eron-map.ts";
export type { EronMapImport, AtlasMarkerIcon } from "./eron-map.ts";
export { UVTT_ADAPTER_VERSION, UvttValidationError, importUvtt, exportUvtt, exportTacticalUvtt, inspectUvttImage } from "./uvtt.ts";
export type { UvttProvenance, FidelityIssue, FidelityReport, UvttImage, UvttImport, UvttExport } from "./uvtt.ts";
export {
  GRUNDRISS_ERZEUGER, GRUNDRISS_VERSION, GRUNDRISS_LIMITS, GRUNDRISS_STANDARD, GrundrissError, erzeugeGrundriss,
} from "./grundriss.ts";
export type {
  GrundrissOptionen, GrundrissEltern, GrundrissAuftrag, GrundrissRaum, GrundrissBericht, Grundriss,
} from "./grundriss.ts";
export { HOEHLE_ERZEUGER, HOEHLE_VERSION, HOEHLE_LIMITS, HOEHLE_STANDARD, erzeugeHoehle } from "./hoehle.ts";
export type { HoehleOptionen, HoehleAuftrag } from "./hoehle.ts";
export { VERSCHACHTELUNG_VERSION, MAX_MASSSTABSSPRUNG, erzeugeVerschachtelt } from "./verschachtelung.ts";
export type { EbenenArt, EbenenAuftrag, VerschachtelungsAuftrag, Uebergang, Verschachtelung, VerschachtelungsBericht } from "./verschachtelung.ts";
export { loeseWfc, WfcError } from "./wfc.ts";
export type { WfcKachel, WfcAuftrag, WfcErgebnis } from "./wfc.ts";
export { SIEDLUNG_ERZEUGER, SIEDLUNG_VERSION, SIEDLUNG_LIMITS, SIEDLUNG_STANDARD, SIEDLUNG_STANDORTE, siedlungStandard, erzeugeSiedlung } from "./siedlung.ts";
export type { SiedlungArt, SiedlungStandort, SiedlungOptionen, SiedlungAuftrag, SiedlungBauwerk, SiedlungStrasse, SiedlungBericht, Siedlung } from "./siedlung.ts";
export { applyCartographyEdit } from "./cartography-edit.ts";
export { applyInteriorEdit } from "./interior-edit.ts";
export type { InteriorEditInput, InteriorEditResult, InteriorEditOperation, InteriorTarget } from "./interior-edit.ts";
export type { CartographyEditInput, CartographyEditOperation, CartographyEditResult, QuarterTurns } from "./cartography-edit.ts";
export { CARTOGRAPHY_EDIT_LIMITS, CARTOGRAPHY_PATTERN_VERSION, solveCartographyPatterns } from "./cartography-patterns.ts";
export type { EditLimits, CartographyPattern, PatternBoundary, PatternCell, PatternSolution } from "./cartography-patterns.ts";
