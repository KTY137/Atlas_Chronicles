// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Annotation, Command, END, Send, START, StateGraph, interrupt } from "@langchain/langgraph";
import { canonicalJson } from "@chronicle/core";
import type { ChronistCallOutcome, ChronistCandidate, ChronistGraph, ChronistGraphPorts, ChronistModelUnit, ChronistSnapshot, ChronistStopReason, ChronistUnitPlan } from "./types.ts";
import { CHRONIST_LIMITS, ChronistValidationError, chronistValue } from "./hash.ts";
import { assertChronist, parseChronistCallOutcome, parseChronistModelReply, parseChronistModelUnit } from "./parse.ts";
import { parseChronistSnapshot } from "./sources.ts";
import { CHRONIST_RULE_UNIT, planChronistUnits } from "./plan.ts";
import { assertChronistParentCandidates, candidateFromDraft, chronistCandidateHash, chronistRuleCandidates, verifyChronistCandidate } from "./verify.ts";

export const CHRONIST_GRAPH_NODES = ["regelwerk", "schedule", "work", "pause", "finish", "dispatch", "verify", "repair", "persist", "settle"] as const;
export const CHRONIST_GRAPH_CHANNELS = ["runId", "statuses", "ready", "stopReason", "unitId", "attempt", "unit", "outcome", "candidates", "schemaRepair", "rejected", "advanceOnResume"] as const;
export const CHRONIST_SEND_TARGETS = ["work"] as const;
export interface ChronistWorkStatus {
  readonly kind: "done" | "blocked" | "skipped";
  readonly attempt: 1 | 2;
  readonly reason: ChronistStopReason | null;
  readonly advanceOnResume: boolean;
  readonly candidateCount: number;
  readonly rejected: boolean;
}
export interface ChronistWorkInput { readonly runId: string; readonly unitId: string; readonly attempt: 1 | 2 }
type Statuses = Record<string, ChronistWorkStatus>;
const statusesChannel = () => Annotation<Statuses>({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) });
const WorkInput = Annotation.Root({ runId: Annotation<string>(), unitId: Annotation<string>(), attempt: Annotation<1 | 2>() });
const WorkOutput = Annotation.Root({ statuses: statusesChannel() });
const Work = Annotation.Root({ ...WorkInput.spec, ...WorkOutput.spec,
  unit: Annotation<ChronistModelUnit | null>({ reducer: (_, b) => b, default: () => null }),
  outcome: Annotation<ChronistCallOutcome | null>({ reducer: (_, b) => b, default: () => null }),
  candidates: Annotation<readonly ChronistCandidate[]>({ reducer: (_, b) => b, default: () => [] }),
  stopReason: Annotation<ChronistStopReason | null>({ reducer: (_, b) => b, default: () => null }),
  schemaRepair: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
  rejected: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
  advanceOnResume: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
});
const Main = Annotation.Root({
  runId: Annotation<string>(), statuses: statusesChannel(),
  ready: Annotation<readonly ChronistWorkInput[]>({ reducer: (_, b) => b, default: () => [] }),
  stopReason: Annotation<ChronistStopReason | null>({ reducer: (_, b) => b, default: () => null }),
});
const same = (a: unknown, b: unknown) => canonicalJson(chronistValue(a)) === canonicalJson(chronistValue(b));
const planOnly = (unit: ChronistModelUnit): ChronistUnitPlan => {
  const { attempt: _attempt, parentResults: _parents, dispatch: _dispatch, ...plan } = unit; return plan;
};

/** Composes StateGraphs only. Authorisation, budgets, durable receipts and every effect stay in ports. */
export function createChronistGraph(ports: ChronistGraphPorts): ChronistGraph {
  async function execute(runId: string, signal: AbortSignal, initial: ChronistSnapshot | null): Promise<void> {
    const snapshot = parseChronistSnapshot(await ports.effects.readSnapshot());
    assertChronist(snapshot.runId === runId && (initial === null || same(initial, snapshot)), "scope-changed");
    const plans = planChronistUnits(snapshot), byId = new Map(plans.map(p => [p.unitId, p]));
    const check = async (): Promise<ChronistStopReason | null> => signal.aborted ? "cancelled" : ports.effects.check();
    const worker = new StateGraph({ stateSchema: Work, input: WorkInput, output: WorkOutput })
      .addNode("dispatch", async (state) => {
        const reason = await check(); if (reason) return { stopReason: reason };
        const plan = byId.get(state.unitId); assertChronist(plan && state.runId === runId);
        const parents = await Promise.all(plan.parentUnitIds.map(async unitId => {
          const parentPlan = byId.get(unitId); assertChronist(parentPlan);
          const candidates = [...await ports.effects.readCandidates(unitId)].sort((a, b) => a.candidateKey < b.candidateKey ? -1 : a.candidateKey > b.candidateKey ? 1 : 0);
          assertChronistParentCandidates(parentPlan, candidates, snapshot);
          return { unitId, candidates };
        }));
        let unit: ChronistModelUnit;
        try {
          unit = parseChronistModelUnit(ports.provider.prepare(plan, snapshot, state.attempt, parents));
          assertChronist(same(planOnly(unit), plan) && unit.attempt === state.attempt, "scope-changed");
          assertChronist(same(unit.parentResults, parents.map(p => ({ unitId: p.unitId, candidateHashes: p.candidates.map(chronistCandidateHash) }))), "scope-changed");
          assertChronist(unit.dispatch.maxOutputChars === plan.maxOutputChars, "scope-changed");
          assertChronist(unit.dispatch.inputChars <= snapshot.budget.maxInputCharsPerCall && unit.dispatch.maxOutputChars <= snapshot.budget.maxOutputCharsPerCall, "budget");
        } catch (error) {
          if (!(error instanceof ChronistValidationError)) throw error;
          return { stopReason: error.code === "budget" ? "budget" as const : "scope-changed" as const };
        }
        await ports.effects.persistUnit(unit);
        const claim = await ports.effects.claimCall(unit, state.attempt);
        if (claim.kind === "stop") return { unit, stopReason: claim.reason, advanceOnResume: claim.reason === "outcome-unknown" };
        let outcome: ChronistCallOutcome;
        if (claim.kind === "recorded") outcome = parseChronistCallOutcome(claim.outcome);
        else {
          assertChronist(claim.permit.requestHash === unit.dispatch.requestHash);
          // Each claimed invocation gets the user's narrower deadline as well as run cancellation.
          // Keep the graph itself alive so the adapter can durably record partial usage after abort.
          const callSignal = AbortSignal.any([signal, AbortSignal.timeout(snapshot.budget.callTimeoutMs)]);
          try { outcome = parseChronistCallOutcome(await ports.provider.invoke(unit, claim.permit, callSignal)); }
          catch {
            // A throwing transport cannot prove non-dispatch; preserve the reservation conservatively.
            outcome = { kind: "failed", code: callSignal.aborted && callSignal.reason?.name === "TimeoutError" ? "timeout" : signal.aborted ? "cancelled" : "unavailable", mayHaveExecuted: true,
              usage: { inputChars: unit.dispatch.inputChars, outputChars: 0, outputComplete: false,
                inputTokens: null, outputTokens: null, tokensComplete: false, durationMs: 0,
                costMicros: null, currency: null, costKind: "unknown", costComplete: false } };
          }
          // This precedes any checkpoint or verification. Replaying dispatch reuses this receipt.
          await ports.effects.recordCall(claim.permit, outcome);
        }
        assertChronist(outcome.usage.inputChars === unit.dispatch.inputChars && outcome.usage.outputChars <= unit.dispatch.maxOutputChars);
        if (outcome.kind === "returned") {
          assertChronist(outcome.reply.text.length <= unit.dispatch.maxOutputChars && outcome.usage.outputChars === outcome.reply.text.length && outcome.usage.outputComplete);
          return { unit, outcome, stopReason: null };
        }
        return { unit, outcome, advanceOnResume: true, stopReason: outcome.mayHaveExecuted && !outcome.usage.outputComplete ? "outcome-unknown" as const
          : outcome.code === "cancelled" ? "cancelled" as const : outcome.code === "output-limit" ? "budget" as const : "provider-unavailable" as const };
      })
      .addNode("verify", async state => {
        assertChronist(state.unit && state.outcome?.kind === "returned");
        let reply;
        try { reply = parseChronistModelReply(JSON.parse(state.outcome.reply.text)); }
        catch { await ports.effects.recordRejection(state.unitId, state.attempt, "schema", 1);
          return { schemaRepair: state.attempt === 1, rejected: true, candidates: [] };
        }
        const candidates: ChronistCandidate[] = []; const counts = { schema: 0, citation: 0, "rule-conflict": 0 };
        for (const draft of reply.candidates) {
          const verified = verifyChronistCandidate(candidateFromDraft(draft, state.unit, snapshot), state.unit, snapshot);
          if (verified.ok) candidates.push(verified.candidate); else counts[verified.reason]++;
        }
        for (const reason of ["schema", "citation", "rule-conflict"] as const) if (counts[reason]) await ports.effects.recordRejection(state.unitId, state.attempt, reason, counts[reason]);
        return { candidates: [...new Map(candidates.map(c => [c.candidateKey, c])).values()], schemaRepair: false,
          rejected: state.rejected || Object.values(counts).some(n => n > 0) };
      })
      .addNode("repair", () => ({ attempt: 2 as const, outcome: null, unit: null, candidates: [], schemaRepair: false }))
      .addNode("persist", async state => {
        const reason = await check(); if (reason) return { stopReason: reason };
        await ports.effects.persistCandidates(state.unitId, state.candidates); return {};
      })
      .addNode("settle", state => ({ statuses: { [state.unitId]: {
        kind: state.stopReason ? "blocked" as const : "done" as const, attempt: state.attempt,
        reason: state.stopReason, advanceOnResume: state.advanceOnResume,
        candidateCount: state.stopReason ? 0 : state.candidates.length, rejected: state.rejected,
      } } }))
      .addEdge(START, "dispatch")
      .addConditionalEdges("dispatch", state => state.stopReason ? "settle" : "verify", ["settle", "verify"])
      .addConditionalEdges("verify", state => state.schemaRepair ? "repair" : "persist", ["repair", "persist"])
      .addEdge("repair", "dispatch").addEdge("persist", "settle").addEdge("settle", END)
      .compile();

    const graph = new StateGraph(Main)
      .addNode("regelwerk", async () => {
        const reason = await check();
        if (reason && reason !== "provider-unavailable" && reason !== "budget") return { stopReason: reason };
        const candidates = chronistRuleCandidates(snapshot);
        assertChronist(candidates.length <= CHRONIST_LIMITS.candidates, "budget");
        await ports.effects.persistCandidates(CHRONIST_RULE_UNIT, candidates); return {};
      })
      .addNode("schedule", async state => {
        const blocked = Object.values(state.statuses).find(s => s.kind === "blocked");
        const reason = state.stopReason ?? blocked?.reason ?? await check();
        if (reason) return { stopReason: reason, ready: [] };
        const ready = plans.filter(p => !state.statuses[p.unitId] && p.parentUnitIds.every(id => state.statuses[id]?.kind === "done"))
          .slice(0, snapshot.budget.concurrency).map(p => ({ runId, unitId: p.unitId, attempt: 1 as const }));
        return { ready };
      })
      .addNode("work", worker)
      .addNode("pause", async state => {
        // A durable control action authorises this resume; the port rechecks its fresh execution fence.
        // No finish effect here: interrupted nodes re-execute and must not close a new execution.
        interrupt({ schemaVersion: 1, runId, reason: state.stopReason });
        const statuses: Statuses = {};
        const ready: ChronistWorkInput[] = [];
        for (const [unitId, status] of Object.entries(state.statuses)) if (status.kind === "blocked") {
          if (status.advanceOnResume && status.attempt === 2) statuses[unitId] = { ...status, kind: "skipped", reason: null };
          else ready.push({ runId, unitId, attempt: status.advanceOnResume ? 2 : status.attempt });
        }
        return { stopReason: null, ready, statuses };
      })
      .addNode("finish", async state => {
        const partial = plans.some(p => state.statuses[p.unitId]?.kind !== "done") || Object.values(state.statuses).some(s => s.rejected);
        await ports.effects.finish(partial ? "partial" : "completed", null); return {};
      })
      .addEdge(START, "regelwerk").addEdge("regelwerk", "schedule")
      .addConditionalEdges("schedule", state => state.stopReason ? "pause" : state.ready.length ? state.ready.map(work => new Send("work", work)) : "finish", ["pause", "work", "finish"])
      .addEdge("work", "schedule")
      .addConditionalEdges("pause", state => state.ready.length ? state.ready.map(work => new Send("work", work)) : "schedule", ["work", "schedule"])
      .addEdge("finish", END)
      .compile({ checkpointer: ports.checkpointer });
    // Cancellation aborts transports and closes effects through check(). Let each worker
    // merge its receipt/status before the parent reaches its durable pause interrupt.
    // Framework requestDrain would stop earlier, leaving a new interrupt to consume on
    // the user's first resume and incorrectly requiring a second confirmation.
    const config = { configurable: { thread_id: runId }, callbacks: [], durability: "sync" as const,
      recursionLimit: 2048, maxConcurrency: snapshot.budget.concurrency };
    const checkpoint = await ports.checkpointer.getTuple(config);
    if (initial !== null) assertChronist(!checkpoint, "scope-changed");
    if (!checkpoint) {
      // A durable server run can be cancelled before the framework's first write.
      // Only this explicit authorised invocation initializes its still-empty graph.
      await graph.invoke({ runId, statuses: {}, ready: [], stopReason: null }, config);
    } else {
      const state = await graph.getState(config);
      assertChronist(state.values.runId === runId, "scope-changed");
      const ids = state.tasks.flatMap(t => t.interrupts.map(i => i.id));
      await graph.invoke(ids.length ? new Command({ resume: Object.fromEntries(ids.map(id => [id, true])) }) : null, config);
    }
    const settled = await graph.getState(config);
    if (settled.tasks.some(t => t.interrupts.length > 0)) {
      // The interrupt is durably checkpointed before relinquishing the execution lease.
      await ports.effects.finish("paused", settled.values.stopReason ?? null);
    }
  }
  return {
    start: (snapshot, signal) => execute(parseChronistSnapshot(snapshot).runId, signal, snapshot),
    resume: (runId, signal) => execute(runId, signal, null),
  };
}
