// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { AnyRulePackage, RuleRuntime, RuleRuntimePreview } from "@chronicle/rules";
import { displayRulePackage } from "./chronicle-heroes-display";

/** Label-only presentation copy. A cached browser package may never supply defaults, bounds,
 * availability, formulas or derived values. Custom wording from the host always wins. */
export function displayRuleRuntime(runtime: RuleRuntime, preview: RuleRuntimePreview | null, source?: AnyRulePackage) {
  if (!source || source.id !== runtime.pin.id || source.version !== runtime.pin.version) return { runtime, preview };
  const view = displayRulePackage(source);
  if (view === source) return { runtime, preview };
  const original = source.schemaVersion === 2 ? source : null, translated = view.schemaVersion === 2 ? view : null;
  const label = (value: string, before: string | undefined, after: string | undefined) => value === before && after !== undefined ? after : value;
  return {
    runtime: { ...runtime,
      fields: Object.fromEntries(Object.entries(runtime.fields).map(([id, field]) => [id, { ...field, label: label(field.label, source.fields[id]?.label, view.fields[id]?.label) }])),
      sections: runtime.sections.map(section => ({ ...section, label: label(section.label, source.layout.sections.find(row => row.id === section.id)?.label, view.layout.sections.find(row => row.id === section.id)?.label) })),
      computed: runtime.computed.map(field => ({ ...field, label: label(field.label, original?.computed?.find(row => row.id === field.id)?.label, translated?.computed?.find(row => row.id === field.id)?.label) })),
      abilities: runtime.abilities.map(ability => {
        const before = original?.abilities?.find(row => row.id === ability.id), after = translated?.abilities?.find(row => row.id === ability.id);
        return { ...ability, name: label(ability.name, before?.name, after?.name), group: label(ability.group, before?.group, after?.group), text: label(ability.text, before?.text, after?.text) };
      }),
      conditions: runtime.conditions.map(condition => {
        const before = original?.conditions?.find(row => row.id === condition.id), after = translated?.conditions?.find(row => row.id === condition.id);
        return { ...condition, name: label(condition.name, before?.name, after?.name), text: label(condition.text, before?.text, after?.text) };
      }),
      actions: runtime.actions.map(action => ({ ...action, name: label(action.name, source.actions.find(row => row.id === action.id)?.name, view.actions.find(row => row.id === action.id)?.name) })),
    },
    preview: preview ? { ...preview, vitals: preview.vitals.map(vital => ({ ...vital, label: label(vital.label, original?.vitals?.find(row => row.id === vital.id)?.label, translated?.vitals?.find(row => row.id === vital.id)?.label) })) } : null,
  };
}
