// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Blockinhalt } from "@chronicle/chronik";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import type { Befund, Zeitereignis } from "./regelwerk.ts";

export type ChronistMode = "prosa" | "sitzung" | "abriss";
export type ChronistKind = "ereignis" | "widerspruch" | "luecke" | "abriss";
export type Sha256 = string; // Laufzeitparser: exakt 64 kleine Hexzeichen
export interface ChronistSourceRef {
  readonly entryId: string; readonly passageId: string;
  readonly revisionId: string; readonly contentHash: Sha256;
}
export interface ChronistSourceSnapshot {
  readonly sourceId: string; readonly ref: ChronistSourceRef;
  readonly title: string; readonly block: Blockinhalt;
  readonly textVersion: "plain-block-1"; readonly text: string;
}
export interface ChronistBudget {
  readonly maxCalls: number; readonly maxInputChars: number;
  readonly maxOutputChars: number; readonly callTimeoutMs: number;
  readonly maxActiveMs: number; readonly concurrency: number;
  readonly maxInputCharsPerCall: number; readonly maxOutputCharsPerCall: number;
}
export interface ChronistSnapshot {
  readonly schemaVersion: 1; readonly graphVersion: "chronist-1";
  readonly runId: string; readonly mode: ChronistMode;
  readonly sessionId: string | null; readonly scopeHash: Sha256;
  readonly sources: readonly ChronistSourceSnapshot[];
  readonly facts: readonly Zeitereignis[];
  readonly budget: ChronistBudget;
}
export interface ChronistCitation {
  readonly sourceId: string; readonly from: number; readonly to: number;
}
export type ChronistDate =
  | { readonly kind: "absolute"; readonly year: number;
      readonly source: ChronistCitation }
  | { readonly kind: "relative"; readonly anchorSourceId: string;
      readonly offsetYears: number; readonly source: ChronistCitation };
export interface ChronistModelDraft {
  readonly kind: "ereignis" | "abriss"; readonly text: string;
  readonly citations: readonly ChronistCitation[];
  readonly date: ChronistDate | null;
}
export interface ChronistUnitPlan {
  readonly unitId: string; readonly mode: ChronistMode;
  readonly sourceIds: readonly string[]; // vollständige Abhängigkeiten
  readonly sourceSpans: readonly ChronistCitation[];
  readonly factIds: readonly string[]; readonly parentUnitIds: readonly string[];
  readonly promptVersion: "chronist-prompt-1";
  readonly maxOutputChars: number;
}
export interface ChronistDispatch {
  readonly schemaVersion: 1; readonly profileId: string; readonly model: string;
  // Vollständiger nichtgeheimer HTTP-Body bzw. CLI-Modellinput samt Systemprompt
  // und Ausgabeschema; der bekannte Profilparser validiert seine geschlossene Form.
  readonly wireText: string; readonly inputChars: number;
  readonly maxOutputChars: number; readonly requestHash: Sha256;
}
export interface ChronistModelUnit extends ChronistUnitPlan {
  readonly attempt: 1 | 2;
  readonly parentResults: readonly { readonly unitId: string;
    readonly candidateHashes: readonly Sha256[] }[];
  readonly dispatch: ChronistDispatch;
}
export interface ChronistCandidate {
  readonly candidateKey: string; readonly kind: ChronistKind;
  readonly blocks: readonly Blockinhalt[];
  readonly citations: readonly ChronistCitation[];
  readonly dependencies: readonly string[];
  readonly origin: "regelwerk" | "modell";
  readonly ruleFinding: Befund | null;
  readonly date: ChronistDate | null;
}
export type ChronistStopReason = "cancelled" | "budget" | "source-stale"
  | "authorization" | "provider-unavailable" | "outcome-unknown" | "call-in-flight"
  | "scope-changed";
export interface ChronistUsageEvidence {
  readonly inputChars: number; // vollständiger gebundener Dispatch
  readonly outputChars: number; // tatsächlich innerhalb des Limits verarbeiteter Text
  readonly outputComplete: boolean; // false: Restreservierung bleibt gebunden
  readonly inputTokens: number | null; readonly outputTokens: number | null;
  readonly tokensComplete: boolean;
  readonly durationMs: number; // bekannte monotone Adapterdauer, kein Rohzeitstempel
  readonly costMicros: number | null; readonly currency: string | null;
  readonly costKind: "reported" | "estimated" | "unknown";
  readonly costComplete: boolean;
}
export interface ChronistProviderReply {
  readonly text: string; // begrenzter Antworttext, keine Header/rohen Fehler
}
export interface ChronistCallPermit {
  readonly callId: string; readonly fence: number;
  readonly requestHash: Sha256; // kurzlebige Capability, nie Modellinhalt
}
export type ChronistCallOutcome =
  | { readonly kind: "returned"; readonly reply: ChronistProviderReply;
      readonly usage: ChronistUsageEvidence }
  | { readonly kind: "failed"; readonly code: "unavailable" | "timeout"
      | "cancelled" | "output-limit"; readonly mayHaveExecuted: boolean;
      readonly usage: ChronistUsageEvidence };
export type ChronistCallClaim =
  | { readonly kind: "invoke"; readonly permit: ChronistCallPermit }
  | { readonly kind: "recorded"; readonly outcome: ChronistCallOutcome }
  | { readonly kind: "stop"; readonly reason: ChronistStopReason };
export interface ChronistProviderPort {
  // Synchron und rein: das Portobjekt ist an ein geprüftes Providerprofil gebunden.
  prepare(plan: ChronistUnitPlan, snapshot: ChronistSnapshot, attempt: 1 | 2,
    parents: readonly { readonly unitId: string;
      readonly candidates: readonly ChronistCandidate[] }[]): ChronistModelUnit;
  invoke(unit: ChronistModelUnit, permit: ChronistCallPermit,
    signal: AbortSignal): Promise<ChronistCallOutcome>;
}
export interface ChronistEffectsPort {
  check(): Promise<ChronistStopReason | null>;
  readSnapshot(): Promise<ChronistSnapshot>;
  readCandidates(unitId: string): Promise<readonly ChronistCandidate[]>;
  persistUnit(unit: ChronistModelUnit): Promise<void>;
  claimCall(unit: ChronistModelUnit, attempt: 1 | 2): Promise<ChronistCallClaim>;
  recordCall(permit: ChronistCallPermit, outcome: ChronistCallOutcome): Promise<void>;
  persistCandidates(unitId: string, candidates: readonly ChronistCandidate[]): Promise<void>;
  recordRejection(unitId: string, attempt: 0 | 1 | 2,
    reason: "schema" | "citation" | "rule-conflict", count: number): Promise<void>;
  finish(result: "completed" | "partial" | "paused",
    reason: ChronistStopReason | null): Promise<void>;
}
export interface ChronistGraphPorts {
  readonly provider: ChronistProviderPort;
  readonly effects: ChronistEffectsPort;
  readonly checkpointer: BaseCheckpointSaver;
}
export interface ChronistGraph {
  start(snapshot: ChronistSnapshot, signal: AbortSignal): Promise<void>;
  resume(runId: string, signal: AbortSignal): Promise<void>;
}
