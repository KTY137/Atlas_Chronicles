// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { CHRONIST_DEFAULT_BUDGET, canonicalChronistSources, chronistCandidateHash, chronistHash, chronistRuleCandidates,
  deriveChronistFacts, makeChronistSourceSnapshot, planChronistUnits, renderChronistUnit,
  type ChronistCallOutcome, type ChronistSnapshot } from "@chronicle/chronist";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { upgradeCampaignBundleV3 } from "../src/native-v4/bundle.ts";
import { emptyCampaignTablesV17, CAMPAIGN_V17_ADDITIONAL_TABLES } from "../src/native-v17/schema.ts";
import { chronistScopeHash, type ChronistProviderRecord, type ChronistRunRow, type ChronistProposalRow, type ChronistCheckpointStore } from "../src/native-v16/data.ts";
import { encodeChronistCheckpoint } from "../src/native-v16/checkpoint-codec.ts";
// The shipped facade, not a pinned version module: the delegation has to hold on the real path.
import { createCurrentCampaignBundle, parseCurrentCampaignBundle, serializeCurrentCampaignBundle, currentCampaignTables,
  currentCampaignSemanticDiff } from "../src/index.ts";
import { createCurrentCampaignBundle as createV15ChainBundle } from "../src/native-v15/current.ts";
import { campaignFixtureV3 } from "./campaign-v3-fixture.ts";

const AT = 1788696000000;
type Mutable = Record<string, Record<string, CanonicalValue>[]>;

/** A dated sentence in the same historical entry: the rule layer only proposes what it can cite. */
function addDatedPassage(tables: Mutable) {
  const revision = tables.revisions!.find(r => r.id === "revision")!;
  const document = revision.document as unknown as { passagen: Record<string, CanonicalValue>[]; tags: string[][] };
  const inhalt = { kind: "absatz", inhalt: [{ text: "Im Jahr 842 fiel das Tor.", marks: [] }] } as unknown as CanonicalValue;
  document.passagen.push({ pid: "passage-2", entryId: "entry", gen: 1, ord: 1, pfad: [], inhalt,
    geltung: "notiz", praegung: null, erstelltInRevision: "revision" } as never);
  document.tags.push([]);
  revision.content_hash = canonicalHash(revision.document as CanonicalValue);
  tables.passages!.push({ id: "passage-2", entry_id: "entry", campaign_id: "campaign", revision_id: "revision", ord: 1,
    path: [], content: inhalt, ast_version: 1, retired_at_revision: null, gen: 1, geltung: "notiz", praegung: null,
    tags: [], provenance: null });
  tables.lineage_events!.push({ seq: "9007199254740994", entry_id: "entry", revision_id: "revision",
    event: { kind: "create", pid: "passage-2" }, created_at: String(AT) });
}

/** One retained entrance plus its historical map.enter event: V15 is the oldest sufficient format. */
function addMapLifecycle(tables: Mutable) {
  const map = tables.tactical_maps!.find(m => m.id === "map")!;
  tables.tactical_maps!.push({ ...map, id: "child" });
  tables.tactical_map_revisions!.push(...tables.tactical_map_revisions!.filter(r => r.map_id === "map").map(r => ({ ...r, map_id: "child" })));
  tables.tactical_map_anchors!.push(...tables.tactical_map_anchors!.filter(a => a.map_id === "map").map(a => ({ ...a, map_id: "child" })));
  const edge = { campaign_id: "campaign", parent_kind: "tactical", parent_map_id: "map", knoten_id: "room",
    map_id: "child", keim_hash: "a".repeat(64), created_by: "gm", created_at: String(AT) };
  tables.betreten_karten = [{ ...edge }];
  tables.betreten_command_receipts = [{ command_id: "enter-baseline", campaign_id: "campaign", actor_user_id: "gm",
    request_hash: "c".repeat(64), response: { mapId: "child", erzeugt: true, keimHash: edge.keim_hash }, created_at: String(AT) }];
  const request = { commandId: "enter-again", knotenId: "room" };
  tables.map_lifecycle_events = [{ seq: "1", command_id: "enter-again", campaign_id: "campaign", actor_user_id: "gm",
    operation: "map.enter", request_hash: canonicalHash({ userId: "gm", campaignId: "campaign", input: request } as CanonicalValue),
    request, payload: { schemaVersion: 1, edge: { ...edge }, createdEdge: false, parentRevision: 2,
      parentVersionBefore: 2, parentVersionAfter: 2 }, ack: { mapId: "child", erzeugt: false, keimHash: edge.keim_hash },
    created_at: String(AT + 1) } as never];
}

function fixture() {
  const legacy = upgradeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3(0))).bundle;
  const tables = JSON.parse(JSON.stringify({ ...emptyCampaignTablesV17(), ...legacy.tables })) as Mutable;
  addDatedPassage(tables); addMapLifecycle(tables);
  const revision = tables.revisions!.find(r => r.id === "revision")!;
  const document = revision.document as unknown as { title: string; passagen: { pid: string; inhalt: CanonicalValue }[] };
  const sources = canonicalChronistSources(document.passagen.map(p => makeChronistSourceSnapshot(
    { entryId: "entry", passageId: p.pid, revisionId: "revision", contentHash: canonicalHash(p.inhalt) },
    document.title, p.inhalt as never)));
  const provider: ChronistProviderRecord = { schemaVersion: 1, model: "synthetic/model", profileId: "ollama-chat-1",
    fingerprint: "b".repeat(64), description: { id: "ollama", label: "Ollama", location: "lokal", transport: "http",
      available: true, availabilityCode: null, models: ["synthetic/model"], pricing: null } };
  const shape = { schemaVersion: 1 as const, graphVersion: "chronist-1" as const, mode: "prosa" as const, sessionId: null,
    sources, facts: deriveChronistFacts(sources), budget: CHRONIST_DEFAULT_BUDGET };
  const snapshot = { ...shape, runId: "run", scopeHash: chronistScopeHash(shape, provider) } as ChronistSnapshot;
  const startRequest = { schemaVersion: 1 as const, operation: "chronist.start" as const, actorUserId: "gm",
    campaignId: "campaign", commandId: "start-run", scopeHash: snapshot.scopeHash, mode: snapshot.mode,
    sessionId: null, sourceRefs: snapshot.sources.map(s => s.ref), providerId: "ollama", model: provider.model,
    providerFingerprint: provider.fingerprint, budget: snapshot.budget, externalConsent: null };
  // One really dispatched unit, its returned call and the graph checkpoint that survived it: the
  // dispatch recipe, `validateCall` and the checkpoint codec all have to cross serialize/parse.
  const plans = planChronistUnits(snapshot);
  const unit = renderChronistUnit(provider.profileId, provider.model, provider.fingerprint, plans[0]!, snapshot, 1, []);
  const reply = '{"schemaVersion":1,"candidates":[]}';
  const usage = { inputChars: unit.dispatch.inputChars, outputChars: reply.length, outputComplete: true,
    inputTokens: 128, outputTokens: 9, tokensComplete: true, durationMs: 280, costMicros: null, currency: null,
    costKind: "unknown" as const, costComplete: false };
  const outcome: ChronistCallOutcome = { kind: "returned", reply: { text: reply }, usage };
  const call = { schemaVersion: 1 as const, runId: "run", unitId: unit.unitId, attempt: 1 as const, callId: "call",
    requestHash: unit.dispatch.requestHash, fence: 1, state: "returned" as const, claimedAt: AT + 10,
    dispatchAt: AT + 20, deadlineAt: AT + 20 + CHRONIST_DEFAULT_BUDGET.callTimeoutMs,
    reservation: { calls: 1 as const, inputChars: unit.dispatch.inputChars, outputChars: unit.dispatch.maxOutputChars,
      storageBytes: unit.dispatch.maxOutputChars * 12 + 65536 },
    usage, outcome, history: [
      { state: "reserved" as const, at: AT + 10, actorUserId: "gm", outcome: null },
      { state: "dispatched" as const, at: AT + 20, actorUserId: "gm", outcome: null },
      { state: "returned" as const, at: AT + 300, actorUserId: "gm", outcome }] };
  const checkpointId = "1f000000-0000-6000-8000-000000000001";
  const checkpoints: ChronistCheckpointStore = { schemaVersion: 1, serializerVersion: "chronist-checkpoint-json-1",
    prunedBefore: [], checkpoints: [{ namespace: "", id: checkpointId, parentId: null, type: "chronist-checkpoint-json-1",
      checkpoint: encodeChronistCheckpoint({ v: 4, id: checkpointId, ts: new Date(AT + 400).toISOString(),
        channel_values: { runId: "run", stopReason: null }, channel_versions: { runId: 1, stopReason: 1 }, versions_seen: {} }),
      metadata: encodeChronistCheckpoint({ source: "loop", step: 0, parents: {}, thread_id: "run" }),
      newVersions: { runId: 1 }, writes: [] }] };
  const run: ChronistRunRow = { id: "run", campaign_id: "campaign", created_by: "gm", created_at: String(AT),
    updated_at: String(AT + 1000), version: 1, state: "paused", mode: "prosa", session_id: null,
    start_command_id: "start-run", start_request: startRequest,
    request_hash: chronistHash("start-request", startRequest as unknown as CanonicalValue),
    start_ack: { runId: "run", version: 1, state: "running" }, snapshot, provider,
    evidence: { schemaVersion: 1, plans, units: [unit], calls: [call], rejections: [],
      controlEvidence: [{ schemaVersion: 1, executionId: "execution", kind: "start", actorUserId: "gm", decidedAt: AT,
        scopeHash: snapshot.scopeHash, providerFingerprint: provider.fingerprint, externalConsent: null,
        freigabeAblaufAt: null, freigabeHash: null, acknowledgeUnknownOutcome: false }],
      executions: [{ executionId: "execution", actorUserId: "gm", fence: 1, startedAt: AT, accountedThrough: AT + 1000,
        reservedUntil: AT + 90_000, closedAt: AT + 1000, closeKind: "paused" }] },
    checkpoints, stop_reason: null, cancel_requested: false, fence: 1,
    lease_owner: null, lease_until: null };
  // The rule candidate is really submitted: the submission request, its hash and the ACK have to
  // travel with the bundle and stay tied to the human revision that carries the antrag passage.
  const candidate = chronistRuleCandidates(snapshot)[0]!;
  const draftHash = chronistHash("draft", candidate.blocks as unknown as CanonicalValue);
  const before = revision.document as unknown as { title: string; slug: string; passagen: Record<string, CanonicalValue>[]; tags: string[][] };
  const antrag = { pid: "passage-antrag", entryId: "entry", gen: 1, ord: before.passagen.length, pfad: [],
    inhalt: candidate.blocks[0] as unknown as CanonicalValue, geltung: "antrag", praegung: null,
    autorUserId: "gm", erstelltInRevision: "revision-2" };
  const submitted = { ...before, passagen: [...before.passagen, antrag as never], tags: [...before.tags, []] };
  tables.revisions!.push({ id: "revision-2", entry_id: "entry", seq: 2, author_user_id: "gm",
    content_hash: canonicalHash(submitted as unknown as CanonicalValue), document: submitted as unknown as CanonicalValue,
    created_at: String(AT + 1000) });
  tables.passages!.push({ id: "passage-antrag", entry_id: "entry", campaign_id: "campaign", revision_id: "revision-2",
    ord: before.passagen.length, path: [], content: candidate.blocks[0] as unknown as CanonicalValue, ast_version: 1,
    retired_at_revision: null, gen: 1, geltung: "antrag", praegung: null, tags: [], provenance: null });
  tables.lineage_events!.push({ seq: "9007199254740995", entry_id: "entry", revision_id: "revision-2",
    event: { kind: "create", pid: "passage-antrag" }, created_at: String(AT + 1000) });
  const entry = tables.entries!.find(e => e.id === "entry")!;
  entry.version = 2; entry.current_revision_id = "revision-2";
  const submissionRequest = { schemaVersion: 1 as const, operation: "chronist.submit" as const, actorUserId: "gm",
    campaignId: "campaign", proposalId: "proposal", commandId: "submit-proposal", expectedVersion: 1,
    expectedDraftHash: draftHash, target: { kind: "existing" as const, entryId: "entry", expectedVersion: 1 } };
  const proposal: ChronistProposalRow = { id: "proposal", campaign_id: "campaign", run_id: "run", unit_id: "regelwerk",
    candidate_key: candidate.candidateKey, version: 2, original: candidate, original_hash: chronistCandidateHash(candidate),
    blocks: candidate.blocks, draft_hash: draftHash,
    dependencies: candidate.dependencies, state: "eingereicht", updated_by: "gm", updated_at: String(AT + 1000),
    accepted_by: "gm", submission_command_id: "submit-proposal", submission_request: submissionRequest,
    submission_request_hash: chronistHash("submit-request", submissionRequest as unknown as CanonicalValue),
    submission_ack: { commandId: "submit-proposal", proposalId: "proposal", proposalVersion: 2, state: "eingereicht",
      entryId: "entry", revisionId: "revision-2", version: 2, passageIds: ["passage-antrag"] } };
  tables.chronist_laeufe = [run as unknown as Record<string, CanonicalValue>];
  tables.chronist_vorschlaege = [proposal as unknown as Record<string, CanonicalValue>];
  return { campaignId: "campaign", universeId: legacy.manifest.universeId, exportedAt: legacy.manifest.exportedAt, tables };
}

const runOf = (data: ReturnType<typeof fixture>) => data.tables.chronist_laeufe![0]! as unknown as ChronistRunRow;
const control = (data: ReturnType<typeof fixture>) =>
  runOf(data).evidence.controlEvidence[0]! as unknown as Record<string, unknown>;
/** Tampering has to write through the retained readonly evidence shapes. */
const loose = (value: unknown) => value as Record<string, unknown>;
const FIGURANTRAG = CAMPAIGN_V17_ADDITIONAL_TABLES.map(table => table.name);

describe("native v16 chronist roundtrip", () => {
  it("exports and reimports filled chronist tables without losing a single retained byte", () => {
    const data = fixture();
    const bundle = createCurrentCampaignBundle(data as never);
    expect(bundle.version).toBe(16);
    const reopened = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle));
    expect(reopened.version).toBe(16);
    expect(reopened.manifest.contentHash).toBe(bundle.manifest.contentHash);
    expect(currentCampaignSemanticDiff(bundle, reopened)).toEqual([]);
    expect(currentCampaignTables(reopened).chronist_laeufe).toEqual(data.tables.chronist_laeufe);
    expect(currentCampaignTables(reopened).chronist_vorschlaege).toEqual(data.tables.chronist_vorschlaege);
    expect(bundle.manifest.modules.map(m => m.name)).toContain("chronist");
  });

  it.each(["chronist_laeufe", "chronist_vorschlaege"] as const)("keeps the %s field set closed", table => {
    const data = fixture();
    data.tables[table]![0]!.zusatz = "nicht im Vertrag";
    expect(() => createCurrentCampaignBundle(data as never)).toThrow(/unknown field/);
  });

  it("stays at V16 while the chronist tables are filled and no figure application exists", () => {
    const data = fixture();
    expect(FIGURANTRAG).toEqual(["figurvorlagen_freigaben", "figurantraege", "figurantrag_events"]);
    for (const table of FIGURANTRAG) expect(data.tables[table]).toEqual([]);
    const bundle = createCurrentCampaignBundle(data as never);
    expect(bundle.version).toBe(16);
    const tables = currentCampaignTables(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)));
    for (const table of FIGURANTRAG) expect(tables[table]).toEqual([]);
  });

  it("falls back to V15 when the V16 and the V17 tables are all empty", () => {
    const data = fixture();
    for (const table of ["chronist_laeufe", "chronist_vorschlaege", ...FIGURANTRAG]) data.tables[table] = [];
    const bundle = createCurrentCampaignBundle(data as never);
    expect(bundle.version).toBe(15);
    const { chronist_laeufe: _runs, chronist_vorschlaege: _proposals, figurvorlagen_freigaben: _releases,
      figurantraege: _applications, figurantrag_events: _events, ...v15Tables } = data.tables;
    expect(createV15ChainBundle({ ...data, tables: v15Tables } as never).manifest.contentHash).toBe(bundle.manifest.contentHash);
    expect(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)).version).toBe(15);
  });

  it.each([
    ["a relabelled attempt", (r: ChronistRunRow) => { loose(r.evidence.units[0]).attempt = 2; }, "complete dispatch recipe"],
    ["a rewritten dispatch", (r: ChronistRunRow) => { loose(r.evidence.units[0]!.dispatch).wireText += " zusätzlicher Kontext"; }, "chronist: schema"],
    ["a call for an unknown request", (r: ChronistRunRow) => { r.evidence.calls[0]!.requestHash = "a".repeat(64); }, "call ownership"],
    ["an understated reservation", (r: ChronistRunRow) => { loose(r.evidence.calls[0]!.reservation).inputChars = 1; }, "call reservation"],
    ["a return before its dispatch", (r: ChronistRunRow) => { r.evidence.calls[0]!.history[2]!.at = AT + 15; }, "call state transition"],
    ["a miscounted reply", (r: ChronistRunRow) => { loose(loose(r.evidence.calls[0]!.outcome).usage).outputChars = 3; }, "returned usage"],
    ["a deadline past the reservation", (r: ChronistRunRow) => { r.evidence.executions[0]!.reservedUntil = AT + 2000; }, "call interval reservation"],
    ["a renamed checkpoint", (r: ChronistRunRow) => { r.checkpoints.checkpoints[0]!.id = "andere-id"; }, "checkpoint fields"],
    ["a smuggled effect in the codec", (r: ChronistRunRow) => {
      r.checkpoints.checkpoints[0]!.checkpoint = { t: "send", node: "beliebiger-effekt", timeout: null,
        args: { t: "object", v: [["attempt", 1], ["runId", "run"], ["unitId", r.evidence.plans[0]!.unitId]] } }; },
      "invalid Send recipe"],
    ["a foreign run in the graph state", (r: ChronistRunRow) => {
      r.checkpoints.checkpoints[0]!.checkpoint = encodeChronistCheckpoint({ v: 4, id: r.checkpoints.checkpoints[0]!.id,
        ts: new Date(AT + 400).toISOString(), channel_values: { runId: "fremder-lauf" }, channel_versions: { runId: 1 }, versions_seen: {} }); },
      "checkpoint run"],
  ])("rejects %s in the run evidence", (_name, mutate, message) => {
    const data = fixture();
    mutate(runOf(data));
    expect(() => createCurrentCampaignBundle(data as never)).toThrow(message);
  });

  it.each([
    ["a forged request hash", (p: ChronistProposalRow) => { loose(p).submission_request_hash = "a".repeat(64); }, "submission original request"],
    ["a substituted submitter", (p: ChronistProposalRow) => { loose(p).accepted_by = "sera"; }, "submission original request"],
    ["a skipped version step", (p: ChronistProposalRow) => { loose(p.submission_ack).proposalVersion = 3; }, "submission original ACK"],
    ["a foreign target revision", (p: ChronistProposalRow) => { loose(p.submission_ack).revisionId = "revision"; }, "submission revision"],
    ["a passage that was never appended", (p: ChronistProposalRow) => { loose(p.submission_ack).passageIds = ["passage"]; }, "historical proposal passage"],
    ["a redrawn draft hash", (p: ChronistProposalRow) => { loose(p).draft_hash = "b".repeat(64); }, "candidate/draft hash"],
  ])("rejects %s in the submission evidence", (_name, mutate, message) => {
    const data = fixture();
    mutate(data.tables.chronist_vorschlaege![0]! as unknown as ChronistProposalRow);
    expect(() => createCurrentCampaignBundle(data as never)).toThrow(message);
  });

  it.each([
    ["an invented field", (c: Record<string, unknown>) => { c.freigabeToken = "geheim"; }, "chronist.freigabeToken: unknown field"],
    ["a dropped field", (c: Record<string, unknown>) => { delete c.externalConsent; }, "chronist.externalConsent: required field missing"],
    ["a rewritten scope", (c: Record<string, unknown>) => { c.scopeHash = "d".repeat(64); }, "control evidence"],
    ["a foreign provider", (c: Record<string, unknown>) => { c.providerFingerprint = "e".repeat(64); }, "control evidence"],
    ["a resumed first decision", (c: Record<string, unknown>) => { c.kind = "resume"; }, "control evidence"],
    ["a moved decision", (c: Record<string, unknown>) => { c.decidedAt = Number(c.decidedAt) + 1; }, "runtime ownership lineage"],
    ["a substituted human", (c: Record<string, unknown>) => { c.actorUserId = "sera"; }, "control interval"],
    ["a local release receipt", (c: Record<string, unknown>) => { c.freigabeHash = "f".repeat(64); }, "external release evidence"],
  ])("rejects %s in the control evidence", (_name, mutate, message) => {
    const data = fixture();
    mutate(control(data));
    expect(() => createCurrentCampaignBundle(data as never)).toThrow(message);
  });
});
