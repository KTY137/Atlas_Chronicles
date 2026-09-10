// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { Block, Id } from "./document-schema.ts";
import type { Blockinhalt } from "@chronicle/chronik";
const closed = { additionalProperties: false } as const;
export const ChronistHash = Type.String({ pattern: "^[a-f0-9]{64}$", minLength: 64, maxLength: 64 });
export const ChronistSourceRefSchema = Type.Object({ entryId: Id, passageId: Id, revisionId: Id, contentHash: ChronistHash }, closed);
export const ChronistBudgetSchema = Type.Object({
  maxCalls: Type.Integer({ minimum: 0, maximum: 128 }), maxInputChars: Type.Integer({ minimum: 0, maximum: 4_000_000 }),
  maxOutputChars: Type.Integer({ minimum: 0, maximum: 512_000 }), callTimeoutMs: Type.Integer({ minimum: 100, maximum: 120_000 }),
  maxActiveMs: Type.Integer({ minimum: 100, maximum: 1_800_000 }), concurrency: Type.Integer({ minimum: 1, maximum: 4 }),
  maxInputCharsPerCall: Type.Integer({ minimum: 100, maximum: 24_000 }), maxOutputCharsPerCall: Type.Integer({ minimum: 1, maximum: 64_000 }),
}, closed);
export const ChronistPreview = Type.Object({ mode: Type.Union([Type.Literal("prosa"),Type.Literal("sitzung"),Type.Literal("abriss")]),
  sessionId: Type.Optional(Id), sourceRefs: Type.Array(ChronistSourceRefSchema,{minItems:1,maxItems:512}),
  providerId: Id, model: Type.String({minLength:1,maxLength:256}), budget: Type.Optional(Type.Partial(ChronistBudgetSchema)) },closed);
/** Die Freigabe ist ein serverseitig signiertes Einmal-Token, keine Behauptung der Oberflaeche. */
export const ChronistFreigabeToken = Type.String({ pattern: "^[A-Za-z0-9_-]{16,512}$", minLength: 16, maxLength: 512 });
export const ChronistExternalConsentSchema = Type.Object({ scopeHash: ChronistHash, token: ChronistFreigabeToken }, closed);
export interface ChronistFreigabe { token: string; ablaufAt: number }
export type ChronistExternalConsent = { scopeHash: string; token: string };
export const StartChronistRun = Type.Composite([ChronistPreview,Type.Object({commandId:Id,scopeHash:ChronistHash,
  externalConsent:Type.Optional(ChronistExternalConsentSchema)})],closed);
export const ChronistControl = Type.Object({expectedVersion:Type.Integer({minimum:1})},closed);
export const ResumeChronistRun = Type.Object({expectedVersion:Type.Integer({minimum:1}),scopeHash:ChronistHash,
  externalConsent:Type.Optional(ChronistExternalConsentSchema),acknowledgeUnknownOutcome:Type.Optional(Type.Boolean())},closed);
export const EditChronistProposal = Type.Object({expectedVersion:Type.Integer({minimum:1}),blocks:Type.Array(Block,{minItems:1,maxItems:1000})},closed);
export const SubmitChronistProposal = Type.Object({commandId:Id,expectedVersion:Type.Integer({minimum:1}),expectedDraftHash:ChronistHash,
  target:Type.Union([Type.Object({kind:Type.Literal("existing"),entryId:Id,expectedVersion:Type.Integer({minimum:1})},closed),
    Type.Object({kind:Type.Literal("new"),title:Type.String({minLength:1,maxLength:200}),slug:Type.Optional(Type.String({minLength:1,maxLength:200}))},closed)])},closed);
export type ChronistPreviewBody = Static<typeof ChronistPreview>;
export type StartChronistRunBody = Static<typeof StartChronistRun>;
export type ResumeChronistRunBody = Static<typeof ResumeChronistRun>;
export type EditChronistProposalBody = Static<typeof EditChronistProposal>;
export type SubmitChronistProposalBody = Static<typeof SubmitChronistProposal>;
export interface ChronistStartAck {readonly runId:string;readonly version:number;readonly state:"running"}
export interface ChronistSubmissionAck {readonly commandId:string;readonly proposalId:string;readonly proposalVersion:number;
  readonly state:"eingereicht";readonly entryId:string;readonly revisionId:string;readonly version:number;readonly passageIds:readonly string[]}
export interface ChronistProviderDescription {readonly id:string;readonly label:string;readonly location:"lokal"|"fremd";
  readonly transport:"http"|"cli";readonly available:boolean;readonly availabilityCode:string|null;
  readonly models:readonly string[];readonly pricing:{readonly currency:string;readonly inputMicrosPerMillion:number;readonly outputMicrosPerMillion:number;readonly asOf:string}|null}
/** Was die Suche nach einem lokalen Modelldienst an EINER Adresse ergeben hat. Die Codes sind
 * Daten des Servers; die Oberflaeche uebersetzt sie an der Anzeigestelle in ganze Saetze.
 * `gefunden` = Dienst antwortet und nennt Modelle · `leer` = Dienst antwortet, hat aber keins
 * installiert · `keine-antwort` = dort lauscht niemand · `zeitueberschreitung` = niemand hat
 * rechtzeitig geantwortet · `unlesbar` = eine Antwort kam, aber keine Modellliste. */
export interface ChronistLocalScanEntry {readonly baseUrl:string;
  readonly code:"gefunden"|"leer"|"keine-antwort"|"zeitueberschreitung"|"unlesbar";
  readonly models:readonly string[];readonly durationMs:number}
/** Der ganze Suchlauf. `found` ist der erste Treffer; danach wird nicht weitergesucht. */
export interface ChronistLocalScanReport {readonly scannedAt:number;
  readonly entries:readonly ChronistLocalScanEntry[];readonly found:ChronistLocalScanEntry|null}
/** Die Antwort des Suchknopfs: der Bericht plus die daraufhin gueltige Anbieterliste. */
export interface ChronistProviderScanResult {readonly scan:ChronistLocalScanReport;
  readonly providers:readonly ChronistProviderDescription[]}
export interface ChronistSourceDescriptor {readonly sourceId:string;readonly ref:Static<typeof ChronistSourceRefSchema>;
  readonly title:string;readonly textVersion:"plain-block-1";readonly text:string;readonly block:Blockinhalt}
export interface ChronistSourcePage {readonly sources:readonly ChronistSourceDescriptor[];readonly after:string|null;readonly complete:boolean}
export interface ChronistPreviewResult {readonly scopeHash:string;readonly mode:ChronistPreviewBody["mode"];readonly sessionId:string|null;
  readonly sources:readonly ChronistSourceDescriptor[];readonly sourceChars:number;readonly budget:Static<typeof ChronistBudgetSchema>;
  readonly provider:ChronistProviderDescription;readonly model:string;readonly modelUnits:number;readonly maxCalls:number;
  readonly ruleFindings:readonly {readonly art:string;readonly titel:string;readonly text:string}[];
  readonly estimate:{readonly inputChars:number;readonly outputChars:number;readonly costMicros:number|null;
    readonly costKind:"estimated"|"unknown";readonly currency:string|null};
  readonly freigabe:ChronistFreigabe|null;readonly warnings:readonly string[]}
export interface ChronistUsageView {readonly calls:number;readonly inputChars:number;readonly outputChars:number;readonly reservedOutputChars:number;
  readonly knownCalls:number;readonly reservedCalls:number;readonly knownInputChars:number;readonly reservedInputChars:number;
  readonly activeMs:number;readonly inputTokens:number|null;readonly outputTokens:number|null;readonly tokensComplete:boolean;
  readonly costMicros:number|null;readonly currency:string|null;readonly costComplete:boolean}
export interface ChronistRunView {readonly runId:string;readonly version:number;readonly state:"running"|"paused"|"partial"|"completed";
  readonly mode:ChronistPreviewBody["mode"];readonly sessionId:string|null;readonly scopeHash:string;readonly provider:ChronistProviderDescription;
  readonly model:string;readonly createdAt:number;readonly updatedAt:number;readonly stopReason:string|null;readonly cancelRequested:boolean;
  readonly budget:Static<typeof ChronistBudgetSchema>;readonly usage:ChronistUsageView;readonly sources:readonly ChronistSourceDescriptor[];
  readonly unknownCalls:number;
  readonly progress:{readonly modelUnits:number;readonly recordedCalls:number;readonly suggestions:number;readonly rejections:number};
  readonly actions:readonly ("cancel"|"resume")[]}
export interface ChronistRunPage {readonly runs:readonly ChronistRunView[];readonly after:string|null;readonly complete:boolean}
export interface ChronistSuggestionView {readonly id:string;readonly runId:string;readonly unitId:string;readonly version:number;
  readonly kind:"ereignis"|"widerspruch"|"luecke"|"abriss";readonly origin:"regelwerk"|"modell";
  readonly state:"offen"|"eingereicht"|"verworfen";readonly originalBlocks:readonly Blockinhalt[];readonly blocks:readonly Blockinhalt[];
  readonly draftHash:string;readonly sources:readonly ChronistSourceDescriptor[];
  readonly citations:readonly {readonly sourceId:string;readonly from:number;readonly to:number}[];
  readonly stale:boolean;readonly submissionAck:ChronistSubmissionAck|null}
export interface ChronistSuggestionPage {readonly suggestions:readonly ChronistSuggestionView[];readonly after:string|null;readonly complete:boolean}
export interface ChronistSessionContext {readonly sessionId:string;readonly scene:{readonly id:string;readonly name:string;readonly fictionDate:string};
  readonly startedAt:number;readonly endedAt:number|null;readonly rolls:readonly {readonly id:string;readonly actorName:string;readonly actionId:string;
    readonly fictionDate:string;readonly confirmedAt:number;readonly resultText:string}[];readonly after:string|null;readonly complete:boolean}
export interface ChronistSessionPage {readonly sessions:readonly {readonly id:string;readonly sceneId:string;readonly name:string;
  readonly startedAt:number;readonly endedAt:number|null}[];readonly after:string|null;readonly complete:boolean}
