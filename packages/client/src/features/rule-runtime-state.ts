// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { PackagePin, RuleRuntime, RuleRuntimeIdentity, RuleRuntimePreview, Scalar } from "@chronicle/rules";

export interface RuleEditorDraft { readonly pin: PackagePin; readonly fields: Readonly<Record<string, Scalar>> | null }
export function switchRuleDraft(draft: RuleEditorDraft, pin: PackagePin): RuleEditorDraft {
  return draft.pin.id === pin.id && draft.pin.version === pin.version ? draft : { pin: { ...pin }, fields: null };
}
export function matchesRuleRuntime(value: unknown, pin: PackagePin, contentHash?: string): value is RuleRuntimeIdentity {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RuleRuntimeIdentity>;
  return candidate.contractVersion === 1 && candidate.pin?.id === pin.id && candidate.pin.version === pin.version
    && typeof candidate.contentHash === "string" && /^[a-f0-9]{64}$/.test(candidate.contentHash)
    && (contentHash === undefined || candidate.contentHash === contentHash);
}
/** Include the campaign, exact package content, every value and the explicit retry epoch. */
export function rulePreviewKey(campaignId: string, runtime: RuleRuntimeIdentity, fields: Readonly<Record<string, Scalar>>, epoch = 0): string {
  return JSON.stringify([campaignId, runtime.pin.id, runtime.pin.version, runtime.contentHash, epoch,
    Object.keys(fields).sort().map(id => [id, fields[id]])]);
}
export interface PreviewSlot { readonly key: string; readonly data: RuleRuntimePreview | null; readonly error: string }
export function currentRulePreview(slot: PreviewSlot, key: string, runtime: RuleRuntimeIdentity | null): RuleRuntimePreview | null {
  return runtime && slot.key === key && !slot.error && slot.data && matchesRuleRuntime(slot.data, runtime.pin, runtime.contentHash) ? slot.data : null;
}
export const ruleIdList = (value: Scalar | undefined): string[] => typeof value === "string" ? [...new Set(value.split(/[\s,]+/).filter(Boolean))] : [];
/** Remove transitive dependants as an explicit edit; the host still validates the resulting sheet. */
export function forgetRuleAbility(runtime: RuleRuntime, learned: readonly string[], id: string): string[] {
  const removed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const ability of runtime.abilities) if (learned.includes(ability.id) && !removed.has(ability.id) && ability.requires?.some(required => removed.has(required))) {
      removed.add(ability.id); changed = true;
    }
  }
  return learned.filter(known => !removed.has(known));
}
