// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, textHash, type CanonicalValue } from "@chronicle/core";
import { defaultActorFields, DEMO_RULE_PACKAGE, evaluateAction, stableJson } from "@chronicle/rules";
import { emptyCampaignTables, type CampaignTableName } from "../src/campaign-schema.ts";

export const TIMESTAMP = 1788696000000;
export const seal = (v: unknown): string => textHash(stableJson(v));
export const value = (v: unknown): CanonicalValue => JSON.parse(JSON.stringify(v)) as CanonicalValue;
export type MutableTables = Record<CampaignTableName, Record<string, CanonicalValue>[]>;
export function campaignFixture(): { campaignId: string; universeId: string; exportedAt: string; tables: MutableTables } {
  const tables = emptyCampaignTables() as MutableTables, at = String(TIMESTAMP);
  tables.users = ["gm", "sera", "brannt"].map(id => ({ id, display_name: id, created_at: at }));
  tables.universes = [{ id: "universe", owner_user_id: "gm", name: "Eron" }];
  tables.campaigns = [{ id: "campaign", universe_id: "universe", owner_user_id: "gm", name: "Die Woche", version: 1, created_at: at }];
  tables.actors = ["sera", "brannt"].map(id => ({ id: `actor-${id}`, campaign_id: "campaign", user_id: id, name: id }));
  tables.campaign_memberships = ["gm", "sera", "brannt"].map(id => ({ campaign_id: "campaign", user_id: id, role: id === "gm" ? "leitung" : "spieler", display_name: id, name_skeleton: id, actor_id: id === "gm" ? null : `actor-${id}` }));
  tables.universe_memberships = [{ universe_id: "universe", user_id: "gm", role: "besitzer" }];
  const content = { kind: "feld", schluessel: "route", label: "Route", werte: [[{ text: "The old route", marks: [] }]], mehrwertig: false, klauselKandidat: false };
  const p = { pid: "passage", entryId: "entry", gen: 1, ord: 0, pfad: [], inhalt: content, geltung: "notiz", praegung: null, erstelltInRevision: "revision" };
  const document = { title: "Haus Vharon", slug: "Haus_Vharon", passagen: [p], tags: [["spuren"]] };
  tables.entries = [{ id: "entry", universe_id: "universe", campaign_id: "campaign", slug: "Haus_Vharon", title: "Haus Vharon", art: "sonstiges", version: 1, current_revision_id: "revision", created_by: "gm", kanonstatus: "geruecht", public: false, parent_entry_id: null }];
  tables.revisions = [{ id: "revision", entry_id: "entry", seq: 1, author_user_id: "gm", content_hash: canonicalHash(value(document)), document: value(document), created_at: at }];
  tables.passages = [{ id: "passage", entry_id: "entry", campaign_id: "campaign", revision_id: "revision", ord: 0, path: [], content: value(content), ast_version: 1, retired_at_revision: null, gen: 1, geltung: "notiz", praegung: null, tags: ["spuren"], provenance: null }];
  tables.lineage_events = [{ seq: "9007199254740993", entry_id: "entry", revision_id: "revision", event: { kind: "create", pid: "passage" }, created_at: at }];
  tables.revelations = [{ campaign_id: "campaign", actor_id: "actor-sera", passage_id: "passage", granted_at: at, granted_by: "gm", vollmacht_id: null, quelle: { art: "gesprochen", sitzung: "manuelle-freigabe" }, revoked_at: null }];
  tables.campaign_messages = [{ id: "message", campaign_id: "campaign", user_id: "sera", author_name: "Sera", body: "Meet next week", parent_id: null, kind: "letter", session_id: null, created_at: at, expires_at: null, removed_at: null }];
  return { campaignId: "campaign", universeId: "universe", exportedAt: new Date(TIMESTAMP).toISOString(), tables };
}

/** A frozen field letter, a real deterministic roll and a saved session baseline. */
export function campaignEvidenceFixture(): ReturnType<typeof campaignFixture> {
  const data = campaignFixture(), t = data.tables, at = String(TIMESTAMP), pkg = DEMO_RULE_PACKAGE;
  t.rule_packages = [{ campaign_id: "campaign", package_id: pkg.id, version: pkg.version, document: value(pkg), content_hash: seal(pkg), installed_by: "gm", installed_at: at }];
  t.campaign_rule_pins = [{ campaign_id: "campaign", package_id: pkg.id, package_version: pkg.version, version: 1 }];
  t.actor_sheets = [{ actor_id: "actor-sera", campaign_id: "campaign", package_id: pkg.id, package_version: pkg.version, fields: value(defaultActorFields(pkg)), version: 1, defeat_pending: false, defeated_at: null, updated_at: at }];
  t.scenes = [{ id: "scene", campaign_id: "campaign", name: "The gate", entry_ids: ["entry"], fiction_date: "16. Nebelmond", status: "active", created_by: "gm", created_at: at, version: 2 }];
  t.game_sessions = [{ id: "session", campaign_id: "campaign", scene_id: "scene", started_at: at, ended_at: null, started_by: "gm" }];
  t.week_baselines = [{ session_id: "session", campaign_id: "campaign", captured_at: at, knowledge: [{ actorId: "actor-sera", passageId: "passage", quelle: { art: "gesprochen", sitzung: "manuelle-freigabe" }, grantedAt: TIMESTAMP }], lineage_seq: "9007199254740993" }];
  const receipt = evaluateAction(pkg, "investigate", { seed: "00000001000000020000000300000004", actor: defaultActorFields(pkg), input: {}, knowledge: { actorId: "actor-sera", passages: [{ passageId: "passage", labels: ["spuren"], experience: "gesprochen" }] } });
  t.action_rolls = [{ id: "action-roll", campaign_id: "campaign", actor_id: "actor-sera", prepared_by: "sera", command_id: "prepare-roll", request_hash: "a".repeat(64), package_id: pkg.id, package_version: pkg.version, action_id: "investigate", receipt: value(receipt), receipt_hash: seal(receipt), target_passage_id: null, target_passage_hash: null, vollmacht_id: null, fiction_date: "16. Nebelmond", prepared_at: at, confirmed_at: null, status: "ausstehend", confirmation: null, scene_id: "scene", session_id: "session" }];
  const content = t.passages[0]!.content as Record<string, CanonicalValue>, { klauselKandidat: _marker, ...projected } = content;
  const snapshot = { passageId: "passage", entryId: "entry", slug: "Haus_Vharon", title: "Haus Vharon", content, path: [], ord: 0, sourceRevisionId: "revision", sourceGen: 1, sourceHash: seal({ passageId: "passage", content: projected, tags: ["spuren"] }), sourceQuelle: { art: "gesprochen", sitzung: "manuelle-freigabe" }, tags: ["spuren"], knownTargets: [] };
  const envelope = { schemaVersion: 1, id: "letter", fromActorId: "actor-sera", toActorIds: ["actor-brannt"], note: "A note, not canon", snapshots: [snapshot], sentAt: TIMESTAMP, sentDay: 1, sentLabel: "Day 1", arrivalDay: 3 };
  t.letters = [{ id: "letter", campaign_id: "campaign", from_actor_id: "actor-sera", sent_by: "sera", command_id: "send-letter", request_hash: "b".repeat(64), note: envelope.note, snapshots: value(envelope.snapshots), seal: seal(envelope), sent_at: at, sent_day: 1, sent_label: "Day 1", arrival_day: 3 }];
  t.letter_recipients = [{ letter_id: "letter", campaign_id: "campaign", actor_id: "actor-brannt", delivered_at: at, delivered_day: 3, delivered_label: "Day 3", read_at: at, read_day: 3 }];
  const proof = { schemaVersion: 1, letterId: "letter", letterSeal: t.letters[0]!.seal, fromActorId: "actor-sera", toActorId: "actor-brannt", sentAt: TIMESTAMP, sentDay: 1, scheduledDay: 3, deliveredAt: TIMESTAMP, deliveredDay: 3, deliveredLabel: "Day 3", passages: [{ passageId: "passage", sourceRevisionId: "revision", sourceHash: snapshot.sourceHash, quelle: { art: "gehoert", von: "actor-sera" }, grant: "current" }] };
  t.letter_delivery_receipts = [{ letter_id: "letter", campaign_id: "campaign", actor_id: "actor-brannt", proof: value(proof), seal: seal(proof), delivered_at: at }];
  return data;
}
