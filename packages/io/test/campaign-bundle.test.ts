import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundle, parseCampaignBundle, serializeCampaignBundle, validateCampaignBundle, campaignSemanticDiff } from "../src/campaign-bundle.ts";
import { CAMPAIGN_BUNDLE_JSON_SCHEMA, CAMPAIGN_TABLES } from "../src/campaign-schema.ts";
import { campaignEvidenceFixture, campaignFixture, seal, value } from "./campaign-fixture.ts";

describe("native campaign contract v1", () => {
  it("round-trips every table collection, durable messages, original IDs and unsafe-in-JS bigint values", () => {
    const bundle = createCampaignBundle(campaignEvidenceFixture()), parsed = parseCampaignBundle(serializeCampaignBundle(bundle));
    expect(campaignSemanticDiff(bundle, parsed)).toEqual([]);
    expect(parsed.tables.lineage_events[0]!.seq).toBe("9007199254740993");
    expect(parsed.tables.letters[0]!.seal).toBe(bundle.tables.letters[0]!.seal);
    expect(parsed.tables.action_rolls[0]!.receipt_hash).toBe(bundle.tables.action_rolls[0]!.receipt_hash);
    expect(Object.keys(parsed.tables).sort()).toEqual(CAMPAIGN_TABLES.map(t => t.name).sort());
  });
  it("normalizes unordered collections and excludes only envelope time from semantic comparison", () => {
    const a = campaignFixture(), b = campaignFixture(); b.tables.users.reverse(); b.exportedAt = "2026-09-07T00:00:00.000Z";
    const ba = createCampaignBundle(a), bb = createCampaignBundle(b);
    expect(ba.manifest.contentHash).toBe(bb.manifest.contentHash); expect(campaignSemanticDiff(ba, bb)).toEqual([]);
    b.tables.campaign_messages[0]!.removed_at = "1788696000001";
    expect(campaignSemanticDiff(ba, createCampaignBundle(b))).toEqual(["campaign_messages"]);
  });
  it("checks each published structural schema against the same complete fixed table metadata", async () => {
    expect(JSON.parse(await readFile(new URL("../schema/campaign-v1.schema.json", import.meta.url), "utf8"))).toEqual(CAMPAIGN_BUNDLE_JSON_SCHEMA);
    const fixture = parseCampaignBundle(await readFile(new URL("./fixtures/campaign-v1.chronicle", import.meta.url), "utf8"));
    expect(campaignSemanticDiff(fixture, createCampaignBundle(campaignEvidenceFixture()))).toEqual([]);
  });
  it.each([
    ["credentials table", (d: ReturnType<typeof campaignFixture>) => Object.assign(d.tables, { credentials: [] })],
    ["platform privilege", (d: ReturnType<typeof campaignFixture>) => { d.tables.users[0]!.platform_role = "leitung"; }],
    ["missing durable table", (d: ReturnType<typeof campaignFixture>) => { Reflect.deleteProperty(d.tables, "letters"); }],
    ["numeric bigint", (d: ReturnType<typeof campaignFixture>) => { d.tables.lineage_events[0]!.seq = 9007199254740992; }],
    ["overflow bigint", (d: ReturnType<typeof campaignFixture>) => { d.tables.lineage_events[0]!.seq = "9223372036854775808"; }],
    ["noncanonical bigint", (d: ReturnType<typeof campaignFixture>) => { d.tables.lineage_events[0]!.seq = "01"; }],
    ["cross-campaign actor", (d: ReturnType<typeof campaignFixture>) => { d.tables.actors[0]!.campaign_id = "other"; }],
    ["wrong actor controller", (d: ReturnType<typeof campaignFixture>) => { d.tables.campaign_memberships[1]!.actor_id = "actor-brannt"; }],
    ["ephemeral message", (d: ReturnType<typeof campaignFixture>) => { d.tables.campaign_messages[0]!.kind = "table"; }],
    ["message expiration", (d: ReturnType<typeof campaignFixture>) => { d.tables.campaign_messages[0]!.expires_at = "1788696000001"; }],
    ["duplicate identity", (d: ReturnType<typeof campaignFixture>) => { d.tables.users.push({ ...d.tables.users[0]! }); }],
    ["unknown AST key", (d: ReturnType<typeof campaignFixture>) => { (d.tables.passages[0]!.content as Record<string, CanonicalValue>).code = "execute"; }],
    ["missing actor reference", (d: ReturnType<typeof campaignFixture>) => { d.tables.revelations[0]!.actor_id = "absent"; }],
    ["entry parent cycle", (d: ReturnType<typeof campaignFixture>) => { d.tables.entries[0]!.parent_entry_id = "entry"; }],
    ["message parent cycle", (d: ReturnType<typeof campaignFixture>) => { d.tables.campaign_messages[0]!.parent_id = "message"; }],
    ["history digest mismatch", (d: ReturnType<typeof campaignFixture>) => { (d.tables.revisions[0]!.document as Record<string, CanonicalValue>).title = "forged"; }],
  ])("rejects %s before any storage adapter is involved", (_name, mutate) => {
    const data = campaignFixture(); mutate(data); expect(() => createCampaignBundle(data)).toThrow();
  });
  it("rejects tampered payloads even when individual rows remain structurally valid", () => {
    const bundle = JSON.parse(serializeCampaignBundle(createCampaignBundle(campaignFixture())));
    bundle.tables.users[0].display_name = "tampered"; expect(() => validateCampaignBundle(bundle)).toThrow(/checksum/);
  });
  it("rejects duplicate JSON keys, unsafe object keys, accessors and cyclic input", () => {
    const text = serializeCampaignBundle(createCampaignBundle(campaignFixture()));
    expect(() => parseCampaignBundle(text.replace('"version":1', '"version":1,"version":1'))).toThrow(/duplicate JSON key/);
    expect(() => parseCampaignBundle(text.replace('"users":', '"__proto__":{},"users":'))).toThrow(/unsafe JSON key/);
    const data = campaignFixture(); Object.defineProperty(data.tables.users[0], "display_name", { enumerable: true, get() { throw new Error("getter ran"); } });
    expect(() => createCampaignBundle(data)).toThrow(/accessors/);
    const cyclic = campaignFixture(); Object.assign(cyclic.tables.users[0]!, { loop: cyclic }); expect(() => createCampaignBundle(cyclic)).toThrow(/cyclic/);
  });
  it("does not relabel human notes as imports or force frozen content to match mutable passage content", () => {
    const data = campaignEvidenceFixture(); data.tables.passages[0]!.content = { kind: "absatz", inhalt: [{ text: "A later human edit", marks: [] }] };
    data.tables.passages[0]!.gen = 7; data.tables.passages[0]!.tags = ["changed"];
    expect(() => createCampaignBundle(data)).not.toThrow();
  });
  it("preserves the explicit legacy revision snapshot absence created by migration 002", () => {
    const data = campaignFixture(); data.tables.revisions[0]!.document = {}; data.tables.revisions[0]!.created_at = "0";
    expect(createCampaignBundle(data).tables.revisions[0]!.document).toEqual({});
  });
  it("verifies frozen field letters with the original projected source hash", () => {
    const data = campaignEvidenceFixture(); expect(() => createCampaignBundle(data)).not.toThrow();
    const snapshots = data.tables.letters[0]!.snapshots as Record<string, CanonicalValue>[];
    snapshots[0]!.sourceHash = seal({ passageId: "passage", content: snapshots[0]!.content, tags: ["spuren"] });
    expect(() => createCampaignBundle(data)).toThrow(/frozen projected source/);
  });
  it("checks deterministic roll evidence independently of the outer manifest checksum", () => {
    const data = campaignEvidenceFixture(), row = data.tables.action_rolls[0]!, receipt = row.receipt as Record<string, CanonicalValue>;
    receipt.total = 999; row.receipt_hash = seal(receipt); expect(() => createCampaignBundle(data)).toThrow(/deterministic replay/);
  });
  it("rejects scene, baseline and delivery reference/state tampering", () => {
    const scene = campaignEvidenceFixture(); scene.tables.scenes[0]!.entry_ids = ["absent"]; expect(() => createCampaignBundle(scene)).toThrow(/missing entries/);
    const baseline = campaignEvidenceFixture(); baseline.tables.week_baselines[0]!.captured_at = "1"; expect(() => createCampaignBundle(baseline)).toThrow(/baseline capture/);
    const delivery = campaignEvidenceFixture(); delivery.tables.letter_recipients[0]!.delivered_day = 4; expect(() => createCampaignBundle(delivery)).toThrow(/delivery identity/);
  });
  it("preserves historical retired passage ordinals, while rejecting duplicate live ordinals", () => {
    const data = campaignFixture(); data.tables.passages.push({ ...data.tables.passages[0]!, id: "old", retired_at_revision: "revision" });
    expect(() => createCampaignBundle(data)).not.toThrow(); data.tables.passages[1]!.retired_at_revision = null;
    expect(() => createCampaignBundle(data)).toThrow(/duplicate entry_id,ord/);
  });
  it("retains unresolved links without pretending every source candidate was accepted", () => {
    const data = campaignFixture(), content = { kind: "absatz", inhalt: [{ text: "Unaccepted source entry", marks: [{ art: "link", zielSlug: "Absent", zielEntryId: "unaccepted-import-id" }] }] };
    data.tables.passages[0]!.content = content;
    const document = data.tables.revisions[0]!.document as Record<string, CanonicalValue>, passages = document.passagen as Record<string, CanonicalValue>[];
    passages[0]!.inhalt = value(content); data.tables.revisions[0]!.content_hash = canonicalHash(document);
    expect(() => createCampaignBundle(data)).not.toThrow();
  });
  it("preserves a historical self-alias after A -> B -> A, rejecting competing identities", () => {
    const data = campaignFixture();
    data.tables.entry_aliases.push({ campaign_id: "campaign", slug: "Haus_Vharon", entry_id: "entry" });
    expect(() => createCampaignBundle(data)).not.toThrow();
    data.tables.entries.push({ ...data.tables.entries[0]!, id: "other-entry", slug: "Other", current_revision_id: "other-revision" });
    data.tables.revisions.push({ ...data.tables.revisions[0]!, id: "other-revision", entry_id: "other-entry", document: {}, created_at: "0" });
    data.tables.entry_aliases[0]!.entry_id = "other-entry";
    expect(() => createCampaignBundle(data)).toThrow(/shadows another entry/);
  });
});
