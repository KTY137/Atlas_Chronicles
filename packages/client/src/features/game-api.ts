// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useRef } from "react";
import type { AnyActionResult as ActionResult, FieldSchema, PackagePin, AnyRulePackage as RulePackage, Scalar } from "@chronicle/rules";
import { api } from "../api";
import { t } from "../i18n";

/** Was dem endgueltigen Loeschen einer Paketversion im Weg steht — der Server zaehlt es auf. */
export type RulePackageHindernis = "eingebaut" | "angeheftet" | "boegen" | "wuerfe";
/** Der Bibliotheksstand einer Paketversion: aus der Bibliothek genommen? loeschbar? warum nicht? */
export interface RulePackageStand { id: string; version: string; genommen: boolean; loeschbar: boolean; hindernisse: RulePackageHindernis[] }
export interface RulesState { packages: RulePackage[]; pin: PackagePin; version: number; bibliothek?: RulePackageStand[] }
export interface ActorSheet { actorId: string; packageId: string; packageVersion: string; fields: Record<string, Scalar>; version: number; defeatPending: boolean; defeatedAt: number | null }
export interface SceneCard { id: string; name: string; entryIds: string[]; fictionDate: string; status: "prepared" | "active" | "ended"; version: number }
export interface MintReceipt { id: string; kind: string; passageId: string; revisionId: string; provenance: Record<string, unknown>; seal: string; confirmedAt: number }
export interface ActionCard { id: string; actorId: string; status: "ausstehend" | "bestaetigt" | "verworfen"; receipt: ActionResult; receiptHash: string; preparedAt: number; fictionDate: string; vollmachtId: string | null;
  confirmation: { rollId: string; success: boolean; mint: MintReceipt | null; confirmedAt: number; seal: string } | null }
export interface DoorCard { id: string; actorId: string; targetSlug: string; actionId: string; expiresAt: number; status: string; repeatable: boolean; passageId?: string; threshold?: number; budgetKind?: "player" | "floating" }
export const defaults = (fields: Readonly<Record<string, FieldSchema>>): Record<string, Scalar> => Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, field.default]));

/** A network retry reuses its command id; a completed gesture allows a new intentional action. */
export function useCommand() {
  const pending = useRef(new Map<string, string>());
  return async <T,>(path: string, body: Record<string, unknown>, method: "POST" | "PUT" | "DELETE" = "POST"): Promise<T> => {
    const fingerprint = JSON.stringify({ path, body, method });
    let commandId = pending.current.get(fingerprint);
    if (!commandId) {
      // Preserve unresolved acknowledgements even when several token forms share this hook.
      // Refuse further new gestures at the bound rather than forgetting a retry identity.
      if (pending.current.size >= 256) throw new Error(t("Zu viele unbestätigte Änderungen. Bitte die ausstehenden Änderungen erneut versuchen."));
      commandId = crypto.randomUUID(); pending.current.set(fingerprint, commandId);
    }
    const value = await api<T>(path, { method, body: { ...body, commandId } });
    if (pending.current.get(fingerprint) === commandId) pending.current.delete(fingerprint);
    return value;
  };
}
