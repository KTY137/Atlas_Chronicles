// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { array, fail, keys, record, snapshotJson, string, deepFreeze, RULE_LIMITS } from "./validation.ts";

export type Experience = "erfahren" | "gesprochen" | "gehoert";
export interface HeldPassage {
  readonly passageId: string;
  readonly labels: readonly string[];
  readonly experience: Experience;
}
/** This is a projection INPUT. The engine has no database, grants, or GM bypass. */
export interface ProjectedKnowledge {
  readonly actorId: string;
  readonly passages: readonly HeldPassage[];
}
export function parseProjectedKnowledge(input: unknown): ProjectedKnowledge {
  const data = record(snapshotJson(input), "knowledge"); keys(data, ["actorId", "passages"], "knowledge");
  string(data.actorId, "knowledge.actorId");
  const seen = new Set<string>();
  for (const p of array(data.passages, "knowledge.passages", RULE_LIMITS.knowledgePassages)) {
    const row = record(p, "held passage"); keys(row, ["passageId", "labels", "experience"], "held passage");
    const pid = string(row.passageId, "passageId"); if (seen.has(pid)) fail("knowledge: duplicate held passage"); seen.add(pid);
    const labels = array(row.labels, "labels", 32).map(v => string(v, "label", 96));
    if (new Set(labels).size !== labels.length) fail("knowledge: duplicate label");
    if (!["erfahren", "gesprochen", "gehoert"].includes(String(row.experience))) fail("knowledge: invalid experience");
  }
  return deepFreeze(data as unknown as ProjectedKnowledge);
}
export function haelt(knowledge: ProjectedKnowledge, passageId: string): boolean {
  return knowledge.passages.some(p => p.passageId === passageId);
}
/** A count of distinct held passages, never a count of hidden source rows. */
export function haelt_etikett(knowledge: ProjectedKnowledge, label: string): number {
  return new Set(knowledge.passages.filter(p => p.labels.includes(label)).map(p => p.passageId)).size;
}
/** Strongest experience among this character's held passages with the label. */
export function erfahrungsgrad(knowledge: ProjectedKnowledge, label: string): Experience | "unbekannt" {
  const rows = knowledge.passages.filter(p => p.labels.includes(label));
  if (rows.some(p => p.experience === "erfahren")) return "erfahren";
  if (rows.some(p => p.experience === "gesprochen")) return "gesprochen";
  return rows.length ? "gehoert" : "unbekannt";
}
