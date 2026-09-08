// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalHash, canonicalJson } from "@chronicle/core";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import type { Blockinhalt } from "@chronicle/chronik";
import { CHRONIST_DEFAULT_BUDGET, CHRONIST_RULE_UNIT, admitChronistValue, candidateFromDraft,
  canonicalChronistSources, chronistCandidateHash, chronistHash, chronistRuleCandidates, chronistValue,
  createChronistGraph, deriveChronistFacts, extractChronistDates, makeChronistSourceSnapshot,
  parseChronistCandidate, parseChronistModelReply, parseChronistSnapshot, parseChronistSourceSnapshot,
  planChronistUnits, renderChronistUnit, resolveChronistDate, verifyChronistCandidate,
  type ChronistCallOutcome, type ChronistCallPermit, type ChronistCandidate, type ChronistEffectsPort,
  type ChronistGraphPorts, type ChronistModelDraft, type ChronistModelUnit, type ChronistSnapshot,
  type ChronistSourceSnapshot, type ChronistStopReason, type ChronistUnitPlan } from "../src/index.ts";

const block = (text: string): Blockinhalt => ({ kind: "absatz", inhalt: [{ text, marks: [] }] });
function source(text: string, id = "one", value: Blockinhalt = block(text), entryId = id): ChronistSourceSnapshot {
  return makeChronistSourceSnapshot({ entryId, passageId: `passage-${id}`, revisionId: `revision-${entryId}`, contentHash: canonicalHash(chronistValue(value)) }, `Title ${id}`, value);
}
function snapshot(sources: readonly ChronistSourceSnapshot[], mode: ChronistSnapshot["mode"] = "prosa", budget: Partial<ChronistSnapshot["budget"]> = {}): ChronistSnapshot {
  const ordered = canonicalChronistSources(sources);
  return parseChronistSnapshot({ schemaVersion: 1, graphVersion: "chronist-1", runId: "run-one", mode,
    sessionId: mode === "sitzung" ? "session-one" : null, scopeHash: "a".repeat(64), sources: ordered,
    facts: deriveChronistFacts(ordered), budget: { ...CHRONIST_DEFAULT_BUDGET, ...budget } });
}
function prepare(plan: ChronistUnitPlan, snap: ChronistSnapshot, attempt: 1 | 2, parents: readonly { unitId: string; candidates: readonly ChronistCandidate[] }[] = []): ChronistModelUnit {
  const wireText = canonicalJson(chronistValue({ schemaVersion: 1, runId: snap.runId, plan, attempt, parents }));
  return { ...plan, attempt, parentResults: parents.map(p => ({ unitId: p.unitId, candidateHashes: p.candidates.map(chronistCandidateHash) })),
    dispatch: { schemaVersion: 1, profileId: "fixture-text-1", model: "fixture", wireText, inputChars: wireText.length,
      maxOutputChars: plan.maxOutputChars, requestHash: chronistHash("dispatch", { wireText, attempt }) } };
}
function draft(s: ChronistSourceSnapshot, kind: "ereignis" | "abriss" = "ereignis"): ChronistModelDraft {
  return { kind, text: "Ein belegter Entwurf.", citations: [{ sourceId: s.sourceId, from: 0, to: Math.min(10, s.text.length) }], date: null };
}
function returned(unit: ChronistModelUnit, text: string): ChronistCallOutcome {
  return { kind: "returned", reply: { text }, usage: { inputChars: unit.dispatch.inputChars, outputChars: text.length,
    outputComplete: true, inputTokens: null, outputTokens: null, tokensComplete: false, durationMs: 1,
    costMicros: null, currency: null, costKind: "unknown", costComplete: false } };
}
function harness(snap: ChronistSnapshot, response?: (unit: ChronistModelUnit, callSignal: AbortSignal) => Promise<ChronistCallOutcome> | ChronistCallOutcome) {
  const saver = new MemorySaver(), candidates = new Map<string, readonly ChronistCandidate[]>();
  const units = new Map<string, ChronistModelUnit>(), receipts = new Map<string, ChronistCallOutcome>();
  const rejections = new Map<string, number>(), events: string[] = [], calls: ChronistModelUnit[] = [];
  let stop: ChronistStopReason | null = null, finish: readonly [string, ChronistStopReason | null] | null = null;
  let crashAfterRecord = false;
  const effects: ChronistEffectsPort = {
    check: async () => stop, readSnapshot: async () => snap,
    readCandidates: async unitId => candidates.get(unitId) ?? [],
    persistUnit: async unit => { events.push(`unit:${unit.unitId}:${unit.attempt}`); const key = `${unit.unitId}:${unit.attempt}`;
      if (units.has(key)) expect(unit).toEqual(units.get(key)); units.set(key, unit); },
    claimCall: async (unit, attempt) => {
      expect(attempt).toBe(unit.attempt); const key = `${unit.unitId}:${attempt}`; expect(units.has(key)).toBe(true);
      events.push(`claim:${key}`); if (receipts.has(key)) return { kind: "recorded", outcome: receipts.get(key)! };
      if (stop) return { kind: "stop", reason: stop };
      if (calls.length >= snap.budget.maxCalls) return { kind: "stop", reason: "budget" };
      return { kind: "invoke", permit: { callId: key, requestHash: unit.dispatch.requestHash, fence: 1 } };
    },
    recordCall: async (permit, outcome) => { events.push(`record:${permit.callId}`); receipts.set(permit.callId, outcome);
      if (crashAfterRecord) { crashAfterRecord = false; throw new Error("fixture crash after durable receipt"); } },
    persistCandidates: async (unitId, values) => { events.push(`candidates:${unitId}`);
      if (candidates.has(unitId)) expect(values).toEqual(candidates.get(unitId)); candidates.set(unitId, values); },
    recordRejection: async (unitId, attempt, reason, count) => { rejections.set(`${unitId}:${attempt}:${reason}`, count); },
    finish: async (result, reason) => { finish = [result, reason]; events.push(`finish:${result}`); },
  };
  const ports: ChronistGraphPorts = { effects, checkpointer: saver, provider: { prepare,
    invoke: async (unit, _permit, _signal) => { calls.push(unit); events.push(`invoke:${unit.unitId}:${unit.attempt}`);
      if (response) return response(unit, _signal);
      const sourceId = unit.sourceSpans[0]?.sourceId ?? unit.sourceIds[0]!;
      return returned(unit, JSON.stringify({ schemaVersion: 1, candidates: [draft(snap.sources.find(s => s.sourceId === sourceId)!, snap.mode === "abriss" ? "abriss" : "ereignis")] }));
    } } };
  return { ports, saver, candidates, calls, events, units, receipts, rejections,
    stop: (value: ChronistStopReason | null) => { stop = value; },
    crash: () => { crashAfterRecord = true; }, get finish() { return finish; } };
}
const signal = () => new AbortController().signal;

describe("Chronist closed source and hash admission", () => {
  it("retains Core's block hash and admits Unicode, escapes and more than 50k nodes", () => {
    const s = source("Ä😀\\\n".repeat(100000));
    expect(parseChronistSourceSnapshot(s)).toEqual(s);
    expect(s.ref.contentHash).toBe(canonicalHash(chronistValue(s.block)));
    const value = { text: "漢\n".repeat(500000), nodes: Array.from({ length: 60001 }, (_, n) => n) };
    expect(admitChronistValue(value).nodes).toBeGreaterThan(50000);
    expect(chronistHash("run-evidence", value)).toBe(canonicalHash({ hashVersion: "chronist-hash-1", kind: "run-evidence", value }));
  });
  it("rejects hostile descriptors, aliases, sparse arrays, cycles and every hard hash boundary", () => {
    let invoked = false; const getter = Object.defineProperty({}, "field", { enumerable: true, get: () => { invoked = true; return "secret"; } });
    const cyclic: unknown[] = []; cyclic.push(cyclic);
    for (const v of [getter, cyclic, new Date(), Array(2), { [Symbol("x")]: 1 }, Object.defineProperty({}, "hidden", { value: 1 }), JSON.parse('{"__proto__":{}}'), { number: Infinity }]) expect(() => chronistValue(v)).toThrow();
    expect(invoked).toBe(false);
    expect(() => chronistHash("unknown", {})).toThrow();
    expect(() => chronistValue("a".repeat(20 * 1024 * 1024))).toThrow();
    expect(() => chronistValue(Array(500000).fill(null))).toThrow();
    let depth: unknown = 1; for (let i = 0; i < 50; i++) depth = [depth]; expect(() => chronistValue(depth)).toThrow();
  });
  it("sorts and deduplicates before snapshot admission; conflicting pins/text/facts fail", () => {
    const a = source("Im Jahr 812 begann der Zug.", "a"), b = source("Notizen ohne Datum.", "b");
    expect(canonicalChronistSources([b, a, a]).map(s => s.ref.entryId)).toEqual(["a", "b"]);
    expect(() => canonicalChronistSources([a, { ...a, ref: { ...a.ref, revisionId: "changed" } }])).toThrow();
    expect(() => parseChronistSourceSnapshot({ ...a, text: "forged" })).toThrow();
    const snap = snapshot([a]); expect(() => parseChronistSnapshot({ ...snap, facts: [] })).toThrow();
    expect(() => parseChronistSnapshot({ ...snap, extra: true })).toThrow();
  });
  it("admits the simultaneous 16 MiB evidence and 2 MiB draft allowance without changing the hash domain", () => {
    const value = { evidence: "x".repeat(16 * 1024 * 1024 - 100), draft: "y".repeat(2 * 1024 * 1024 - 100) };
    expect(admitChronistValue(value).bytes).toBeLessThan(18 * 1024 * 1024);
    expect(chronistHash("run-evidence", value)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Chronist deterministic rule-first plans and verification", () => {
  it("extracts certain prose years without inventing gaps or treating two events as contradictory dates", () => {
    const snap = snapshot([source("Im Jahr -812 begann der Zug. Im Jahr 500 endete die Reise.")]);
    expect(snap.facts.map(f => f.jahr)).toEqual([-812, 500]); expect(planChronistUnits(snap)).toEqual([]);
    expect(chronistRuleCandidates(snap).map(c => c.kind)).toEqual(["ereignis", "ereignis"]);
    expect(extractChronistDates(source("Es waren 1234 Soldaten. Um Jahr 900 zog er fort."))).toEqual([]);
    expect(extractChronistDates(source("Mara wurde 812 geboren und starb 900.")).map(e => [e.art, e.year])).toEqual([["geburt", 812], ["tod", 900]]);
  });
  it("keeps unresolved sentences and only saved session snapshots in explicit units", () => {
    const snap = snapshot([source("Im Jahr 812 begann der Zug. Zwei Jahre später fiel die Burg.")]);
    const plans = planChronistUnits(snap); expect(plans).toHaveLength(1);
    expect(plans[0]!.sourceSpans[0]!.from).toBeGreaterThan(0);
    expect(() => parseChronistSnapshot({ ...snap, mode: "sitzung", sessionId: null })).toThrow();
    expect(planChronistUnits(snapshot(snap.sources, "sitzung"))).toHaveLength(1);
  });
  it("derives unlesbares_datum and cross-passage birth/death findings with complete dependencies", () => {
    const field = (key: string, text: string): Blockinhalt => ({ kind: "feld", schluessel: key, label: key, werte: [[{ text, marks: [] }]], mehrwertig: false, klauselKandidat: false });
    const snap = snapshot([source("812", "a", field("geburt", "812"), "person"), source("799", "b", field("tod", "799"), "person"), source("unbekannt", "c", field("datum", "unbekannt"))]);
    const candidates = chronistRuleCandidates(snap);
    expect(candidates.find(c => c.kind === "widerspruch")!.dependencies).toHaveLength(2);
    expect(candidates.find(c => c.kind === "luecke")!.ruleFinding?.art).toBe("unlesbares_datum");
    const uncertain = snapshot([source("um 812", "a", field("geburt", "um 812"))]);
    expect(uncertain.facts[0]).toMatchObject({ jahr: 812, genau: false });
    expect(chronistRuleCandidates(uncertain)).toEqual([]);
  });
  it("checks relative anchors, integer offsets, source spans, contradictions and surrogate boundaries", () => {
    const anchor = source("Im Jahr 812 begann die Reise.", "anchor"), relative = source("😀 Zwei Jahre später fiel die Burg.", "relative");
    const snap = snapshot([anchor, relative]), unit = prepare(planChronistUnits(snap)[0]!, snap, 1);
    const citation = { sourceId: relative.sourceId, from: 0, to: relative.text.length };
    const value: ChronistModelDraft = { kind: "ereignis", text: "Die Burg fiel.", citations: [citation], date: { kind: "relative", anchorSourceId: anchor.sourceId, offsetYears: 2, source: citation } };
    const candidate = candidateFromDraft(value, unit, snap);
    expect(resolveChronistDate(candidate.date!, snap)).toBe(814); expect(verifyChronistCandidate(candidate, unit, snap).ok).toBe(true);
    const wrongOffset = candidateFromDraft({ ...value, date: { kind: "relative", anchorSourceId: anchor.sourceId, offsetYears: 99, source: citation } }, unit, snap);
    expect(verifyChronistCandidate(wrongOffset, unit, snap)).toEqual({ ok: false, reason: "rule-conflict" });
    const foreign = candidateFromDraft({ ...value, date: { ...value.date as Extract<NonNullable<typeof value.date>, { kind: "relative" }>, anchorSourceId: "c".repeat(64) } }, unit, snap);
    expect(verifyChronistCandidate(foreign, unit, snap).ok).toBe(false);
    const split = candidateFromDraft({ ...value, date: null, citations: [{ ...citation, from: 1 }] }, unit, snap);
    expect(verifyChronistCandidate(split, unit, snap)).toEqual({ ok: false, reason: "citation" });
    const reduced = { ...candidate, dependencies: [relative.sourceId] }; expect(verifyChronistCandidate(reduced, unit, snap).ok).toBe(false);
    const session = snapshot([anchor], "sitzung"), sessionUnit = prepare(planChronistUnits(session)[0]!, session, 1);
    const contradictory = candidateFromDraft({ ...draft(anchor), citations: [{ sourceId: anchor.sourceId, from: 0, to: anchor.text.length }], date: { kind: "absolute", year: 700, source: { sourceId: anchor.sourceId, from: 0, to: anchor.text.length } } }, sessionUnit, session);
    expect(verifyChronistCandidate(contradictory, sessionUnit, session)).toEqual({ ok: false, reason: "rule-conflict" });
  });
  it("preplans the abriss final node and propagates all transitive input dependencies", () => {
    const snap = snapshot([source("Sichtbare Geschichte.", "a"), source("Geheime Geschichte.", "b"), source("Weitere Geschichte.", "c")], "abriss");
    const plans = planChronistUnits(snap); expect(plans).toHaveLength(5);
    expect(plans.at(-1)!.parentUnitIds).toHaveLength(2); expect(plans.at(-1)!.sourceIds).toHaveLength(3);
    const unit = prepare(plans.at(-1)!, snap, 1), c = candidateFromDraft(draft(snap.sources[0]!, "abriss"), unit, snap);
    expect(verifyChronistCandidate(c, unit, snap).ok).toBe(true); expect(c.dependencies).toHaveLength(3);
  });
  it("rejects model-controlled metadata, executable structures, invalid dates and uncited drafts", () => {
    const s = source("Text.");
    for (const candidate of [{ ...draft(s), status: "kanon" }, { ...draft(s), citations: [] }, { ...draft(s), text: "<script>alert(1)</script>" }, { ...draft(s), date: { kind: "absolute", year: 1.5, source: draft(s).citations[0] } }])
      expect(() => parseChronistModelReply({ schemaVersion: 1, candidates: [candidate] })).toThrow();
    expect(() => parseChronistCandidate({ ...draft(s), origin: "modell" })).toThrow();
  });
});

describe("Chronist real StateGraph and durable call boundary", () => {
  it("runs rules without a model call, including clear prose dates", async () => {
    const h = harness(snapshot([source("Im Jahr 812 begann die Reise.")]));
    await createChronistGraph(h.ports).start(await h.ports.effects.readSnapshot(), signal());
    expect(h.calls).toHaveLength(0); expect(h.candidates.get(CHRONIST_RULE_UNIT)).toHaveLength(1); expect(h.finish).toEqual(["completed", null]);
  });
  it.each(["prosa", "sitzung", "abriss"] as const)("executes %s with persisted rules/units/receipts before proposals", async mode => {
    const snap = snapshot([source("Eine Reise ohne eindeutiges Datum.")], mode), h = harness(snap);
    await createChronistGraph(h.ports).start(snap, signal());
    expect(h.calls).toHaveLength(1); expect(h.finish).toEqual(["completed", null]);
    expect(h.events[0]).toBe(`candidates:${CHRONIST_RULE_UNIT}`);
    const id = h.calls[0]!.unitId;
    expect(h.events.indexOf(`unit:${id}:1`)).toBeLessThan(h.events.indexOf(`invoke:${id}:1`));
    expect(h.events.indexOf(`record:${id}:1`)).toBeLessThan(h.events.indexOf(`candidates:${id}`));
  });
  it("takes only the explicit schema repair edge and never a third attempt", async () => {
    const snap = snapshot([source("Eine Reise ohne Datum.")]);
    const h = harness(snap, unit => returned(unit, "broken schema"));
    await createChronistGraph(h.ports).start(snap, signal());
    expect(h.calls.map(u => u.attempt)).toEqual([1, 2]); expect(h.rejections.size).toBe(2); expect(h.finish).toEqual(["partial", null]);
  });
  it("accepts repaired schema and records invalid citations without another attempt", async () => {
    const snap = snapshot([source("Eine Reise ohne Datum.")]);
    const h = harness(snap, unit => returned(unit, unit.attempt === 1 ? "bad" : JSON.stringify({ schemaVersion: 1, candidates: [draft(snap.sources[0]!)] })));
    await createChronistGraph(h.ports).start(snap, signal()); expect(h.calls).toHaveLength(2); expect(h.candidates.get(h.calls[0]!.unitId)).toHaveLength(1);
    const bad = harness(snap, unit => returned(unit, JSON.stringify({ schemaVersion: 1, candidates: [{ ...draft(snap.sources[0]!), citations: [{ sourceId: "f".repeat(64), from: 0, to: 2 }] }] })));
    await createChronistGraph(bad.ports).start(snap, signal()); expect(bad.calls).toHaveLength(1); expect([...bad.rejections.keys()][0]).toContain("citation");
  });
  it("restarts an actual saver after the response/checkpoint crash without another provider call", async () => {
    const snap = snapshot([source("Eine Reise ohne Datum.")]), h = harness(snap); h.crash();
    await expect(createChronistGraph(h.ports).start(snap, signal())).rejects.toThrow("fixture crash"); expect(h.calls).toHaveLength(1);
    const restarted = new MemorySaver(); restarted.storage = structuredClone(h.saver.storage); restarted.writes = structuredClone(h.saver.writes);
    await createChronistGraph({ ...h.ports, checkpointer: restarted }).resume(snap.runId, signal());
    expect(h.calls).toHaveLength(1); expect(h.finish).toEqual(["completed", null]);
  });
  it("pauses unknown outcomes via interrupt and reserves a new attempt only on explicit resume", async () => {
    const snap = snapshot([source("Eine Reise ohne Datum.")]);
    const h = harness(snap, unit => unit.attempt === 1 ? { kind: "failed", code: "timeout", mayHaveExecuted: true,
      usage: { ...returned(unit, "").usage, outputComplete: false } } : returned(unit, JSON.stringify({ schemaVersion: 1, candidates: [draft(snap.sources[0]!)] })));
    await createChronistGraph(h.ports).start(snap, signal()); expect(h.calls).toHaveLength(1); expect(h.finish).toEqual(["paused", "outcome-unknown"]);
    const checkpoint = await h.saver.getTuple({ configurable: { thread_id: snap.runId } }); expect(checkpoint?.pendingWrites?.some(w => w[1] === "__interrupt__")).toBe(true);
    await createChronistGraph(h.ports).resume(snap.runId, signal()); expect(h.calls.map(u => u.attempt)).toEqual([1, 2]); expect(h.finish).toEqual(["completed", null]);
    expect(h.events.filter(e => e === "finish:paused")).toHaveLength(1);
  });
  it("keeps successful fan-out siblings completed across a stopped sibling and saver restart", async () => {
    const snap = snapshot([source("Erste undatierte Reise.", "a"), source("Zweite undatierte Reise.", "b")]);
    let active = 0, maxActive = 0;
    const h = harness(snap, async unit => { active++; maxActive = Math.max(maxActive, active); await new Promise(resolve => setTimeout(resolve, 5)); active--;
      return unit.sourceIds.includes(snap.sources[1]!.sourceId) && unit.attempt === 1 ? { kind: "failed", code: "timeout", mayHaveExecuted: true, usage: { ...returned(unit, "").usage, outputComplete: false } }
        : returned(unit, JSON.stringify({ schemaVersion: 1, candidates: [draft(snap.sources.find(s => unit.sourceIds.includes(s.sourceId))!)] })); });
    await createChronistGraph(h.ports).start(snap, signal()); expect(maxActive).toBe(2); expect(h.calls).toHaveLength(2);
    const restarted = new MemorySaver(); restarted.storage = structuredClone(h.saver.storage); restarted.writes = structuredClone(h.saver.writes);
    await createChronistGraph({ ...h.ports, checkpointer: restarted }).resume(snap.runId, signal());
    expect(h.calls).toHaveLength(3); expect(h.calls.filter(u => u.sourceIds.includes(snap.sources[0]!.sourceId))).toHaveLength(1); expect(h.finish).toEqual(["completed", null]);
  });
  it("finishes the abriss DAG using only the actual verified original parent candidates", async () => {
    const snap = snapshot([source("Erste Geschichte.", "a"), source("Geheime Geschichte.", "b")], "abriss"), h = harness(snap);
    await createChronistGraph(h.ports).start(snap, signal()); expect(h.calls).toHaveLength(3);
    const final = h.calls.at(-1)!; expect(final.parentResults).toHaveLength(2);
    for (const parent of final.parentResults) expect(parent.candidateHashes).toEqual(h.candidates.get(parent.unitId)!.map(chronistCandidateHash));
    expect(h.candidates.get(final.unitId)![0]!.dependencies).toHaveLength(2);
  });
  it("composes the actual pure provider renderer with canonically ordered verified parents", async () => {
    const snap = snapshot([source("Erste Geschichte.", "a"), source("Geheime Geschichte.", "b")], "abriss");
    const h = harness(snap, unit => {
      const s = snap.sources.find(s => unit.sourceIds.includes(s.sourceId))!;
      const candidates = unit.parentUnitIds.length ? [draft(s, "abriss")] : [draft(s, "abriss"), { ...draft(s, "abriss"), text: "Zweiter belegter Entwurf." }];
      return returned(unit, JSON.stringify({ schemaVersion: 1, candidates }));
    });
    await createChronistGraph({ ...h.ports, provider: { ...h.ports.provider,
      prepare: (plan, snap, attempt, parents) => renderChronistUnit("ollama-chat-1", "fixture:model", "c".repeat(64), plan, snap, attempt, parents),
    } }).start(snap, signal());
    expect(h.calls).toHaveLength(3); expect(h.finish).toEqual(["completed", null]);
    expect(h.calls.at(-1)!.parentResults.every(p => p.candidateHashes.length === 2)).toBe(true);
  });
  it.each(["cancelled", "budget", "source-stale", "authorization", "call-in-flight", "scope-changed"] as const)("stops %s without an automatic provider attempt", async reason => {
    const snap = snapshot([source("Eine Reise ohne Datum.")]), h = harness(snap); h.stop(reason);
    await createChronistGraph(h.ports).start(snap, signal()); expect(h.calls).toHaveLength(0); expect(h.finish).toEqual(["paused", reason]);
  });
  it("cancellation during invoke records consumption before its durable pause", async () => {
    const controller = new AbortController(), snap = snapshot([source("Eine Reise ohne Datum.")]);
    const h = harness(snap, unit => { controller.abort(); return { kind: "failed", code: "cancelled", mayHaveExecuted: true, usage: { ...returned(unit, "").usage, outputComplete: false } }; });
    await createChronistGraph(h.ports).start(snap, controller.signal); expect(h.receipts.size).toBe(1); expect(h.finish).toEqual(["paused", "outcome-unknown"]);
  });
  it("enforces the configured per-call timeout on a waiting adapter and retains partial usage without retry", async () => {
    const outer = new AbortController(), snap = snapshot([source("Eine Reise ohne Datum.")], "prosa", { callTimeoutMs: 40 });
    let abortName: string | null = null, outputChars = 0;
    const h = harness(snap, (unit, callSignal) => new Promise(resolve => {
      const started = performance.now();
      const chunkTimer = setTimeout(() => { outputChars = "Ä😀".length; }, 5);
      const settle = () => {
        clearTimeout(chunkTimer); clearTimeout(guard); callSignal.removeEventListener("abort", settle);
        abortName = callSignal.aborted ? String(callSignal.reason?.name) : null;
        resolve({ kind: "failed", code: abortName === "TimeoutError" ? "timeout" : "unavailable", mayHaveExecuted: true,
          usage: { inputChars: unit.dispatch.inputChars, outputChars, outputComplete: false,
            inputTokens: 10, outputTokens: 2, tokensComplete: false, durationMs: Math.floor(performance.now() - started),
            costMicros: 7, currency: "EUR", costKind: "reported", costComplete: false } });
      };
      // A bounded test guard turns a missing timeout into a red assertion rather than a hanging test.
      const guard = setTimeout(settle, 500);
      callSignal.addEventListener("abort", settle, { once: true });
      if (callSignal.aborted) settle();
    }));
    await createChronistGraph(h.ports).start(snap, outer.signal);
    expect(abortName).toBe("TimeoutError"); expect(outer.signal.aborted).toBe(false);
    expect(h.calls).toHaveLength(1); expect(h.rejections.size).toBe(0);
    const receipt = [...h.receipts.values()][0]!;
    expect(receipt).toMatchObject({ kind: "failed", code: "timeout", mayHaveExecuted: true,
      usage: { inputChars: h.calls[0]!.dispatch.inputChars, outputChars: 3, outputComplete: false,
        inputTokens: 10, outputTokens: 2, tokensComplete: false, costMicros: 7, currency: "EUR", costKind: "reported", costComplete: false } });
    expect(receipt.usage.durationMs).toBeGreaterThanOrEqual(snap.budget.callTimeoutMs - 5);
    expect(h.finish).toEqual(["paused", "outcome-unknown"]);
  });
  it("resumes a response received during cancellation from its saved subgraph checkpoint", async () => {
    const controller = new AbortController(), snap = snapshot([source("Eine Reise ohne Datum.")]);
    const h = harness(snap, unit => { controller.abort(); return returned(unit, JSON.stringify({ schemaVersion: 1, candidates: [draft(snap.sources[0]!)] })); });
    await createChronistGraph(h.ports).start(snap, controller.signal);
    await createChronistGraph(h.ports).resume(snap.runId, signal());
    expect(h.calls).toHaveLength(1); expect(h.finish).toEqual(["completed", null]);
  });
  it("one explicit continuation after user cancellation advances the uncertain attempt", async () => {
    const controller = new AbortController(), snap = snapshot([source("Eine Reise ohne Datum.")]);
    let attempts = 0;
    const h = harness(snap, unit => {
      if (++attempts === 1) {
        controller.abort();
        return { kind: "failed", code: "cancelled", mayHaveExecuted: true,
          usage: { ...returned(unit, "Teil").usage, outputComplete: false } };
      }
      return returned(unit, JSON.stringify({ schemaVersion: 1, candidates: [draft(snap.sources[0]!)] }));
    });
    await createChronistGraph(h.ports).start(snap, controller.signal);
    expect(h.calls).toHaveLength(1); expect(h.receipts.size).toBe(1);
    // A new graph invocation stands for exactly one newly authorised server resume.
    await createChronistGraph(h.ports).resume(snap.runId, signal());
    expect(h.calls.map(unit => unit.attempt)).toEqual([1, 2]);
    expect(h.finish).toEqual(["completed", null]);
    expect([...h.receipts.values()][0]).toMatchObject({ kind: "failed", usage: { outputChars: 4, outputComplete: false } });
  });
  it("continues a durable run cancelled before the graph could create its first checkpoint", async () => {
    const snap = snapshot([source("Eine Reise ohne Datum.")]), h = harness(snap);
    // The server committed the run snapshot, then cancelled before its first graph write.
    expect(await h.saver.getTuple({ configurable: { thread_id: snap.runId } })).toBeUndefined();
    await createChronistGraph(h.ports).resume(snap.runId, signal());
    expect(h.calls).toHaveLength(1); expect(h.finish).toEqual(["completed", null]);
    expect(h.events[0]).toMatch(/^candidates:regelwerk$/);
  });
  it("keeps a thrown timeout uncertain and does not automatically retry", async () => {
    const snap = snapshot([source("Eine Reise ohne Datum.")], "prosa", { callTimeoutMs: 20 });
    const h = harness(snap, (_unit, callSignal) => new Promise((_resolve, reject) => {
      const guard = setTimeout(() => reject(new Error("fixture timeout missing")), 500);
      const abort = () => { clearTimeout(guard); reject(callSignal.reason); };
      if (callSignal.aborted) abort(); else callSignal.addEventListener("abort", abort, { once: true });
    }));
    await createChronistGraph(h.ports).start(snap, signal());
    expect(h.calls).toHaveLength(1); expect([...h.receipts.values()][0]).toMatchObject({ kind: "failed", code: "timeout", mayHaveExecuted: true,
      usage: { inputChars: h.calls[0]!.dispatch.inputChars, outputChars: 0, outputComplete: false } });
    expect(h.finish).toEqual(["paused", "outcome-unknown"]);
  });
});
