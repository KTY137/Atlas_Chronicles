// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import type { PackagePin, RuleRuntime, RuleRuntimePreview, Scalar } from "@chronicle/rules";
import { api, apiPath, errorText } from "../api";
import { useResource } from "../hooks";
import { t } from "../i18n";
import { currentRulePreview, matchesRuleRuntime, rulePreviewKey, type PreviewSlot } from "./rule-runtime-state";

/** No browser fallback: failed or stale host evaluations may not enable a save. */
export function useHostRules(campaignId: string, pin: PackagePin, draft: Readonly<Record<string, Scalar>> | null) {
  const [epoch, setEpoch] = useState(0);
  const path = apiPath(campaignId, `/rules/runtime?${new URLSearchParams({ packageId: pin.id, packageVersion: pin.version })}`);
  const source = useResource<RuleRuntime>(path, epoch);
  const manifest = source.data && matchesRuleRuntime(source.data, pin) ? source.data : null;
  const values = draft ?? manifest?.defaults ?? null;
  const key = manifest && values ? rulePreviewKey(campaignId, manifest, values, epoch) : "";
  const [slot, setSlot] = useState<PreviewSlot>({ key: "", data: null, error: "" });
  useEffect(() => {
    if (!manifest || !values || !key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api<RuleRuntimePreview>(apiPath(campaignId, "/rules/runtime/preview"), {
        method: "POST", signal: controller.signal,
        body: { packageId: manifest.pin.id, packageVersion: manifest.pin.version, contentHash: manifest.contentHash, fields: values },
      }).then(data => {
        if (controller.signal.aborted) return;
        if (!matchesRuleRuntime(data, manifest.pin, manifest.contentHash)) throw new Error(t("Die Regelantwort passt nicht zum aktuellen Entwurf. Bitte erneut laden."));
        setSlot({ key, data, error: "" });
      }).catch(error => {
        if (!controller.signal.aborted) setSlot({ key, data: null, error: errorText(error) });
      });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [campaignId, manifest, values, key]);
  // Key comparison happens during render, not in an effect one frame too late. This also
  // rejects A->B->A races and edits made while a non-cancellable transport completes.
  const preview = currentRulePreview(slot, key, manifest);
  const error = source.error || (source.data && !manifest ? t("Die Regelantwort passt nicht zum aktuellen Entwurf. Bitte erneut laden.") : "") || (slot.key === key ? slot.error : "");
  return { manifest, values, preview, error, pending: !error && (!manifest || !preview),
    canSave: !error && !!preview?.valid && preview.fields !== null,
    reload: () => setEpoch(value => value + 1) };
}
export type HostRuleEditorState = ReturnType<typeof useHostRules>;
