// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState, type ReactNode } from "react";
import { RULE_LIMITS, decodeRuleCollectionValue, encodeRuleCollectionValue, type RuleCollection, type RulePresentationNode, type RuleRuntime, type RuleRuntimePreview, type Scalar } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { RuleFields } from "./RuleFields";
import { VitalBar } from "./Vitalanzeige";
import { forgetRuleAbility, ruleIdList } from "./rule-runtime-state";

type RuntimeAbility = RuleRuntime["abilities"][number];
interface AbilityGroupNode { label: string; path: string; rows: RuntimeAbility[]; children: Map<string, AbilityGroupNode> }

function abilityGroupTree(rows: readonly RuntimeAbility[]): AbilityGroupNode[] {
  const root = new Map<string, AbilityGroupNode>();
  for (const ability of rows) {
    const parts = ability.group.split("/").map(part => part.trim()).filter(Boolean);
    if (!parts.length) parts.push(t("Weitere Fähigkeiten"));
    let level = root, path = ""; let node: AbilityGroupNode | undefined;
    for (const part of parts) {
      path = path ? `${path} / ${part}` : part;
      node = level.get(part);
      if (!node) { node = { label: part, path, rows: [], children: new Map() }; level.set(part, node); }
      level = node.children;
    }
    node!.rows.push(ability);
  }
  return [...root.values()];
}
function AbilityGroups({ rows, renderRow }: { rows: readonly RuntimeAbility[]; renderRow(ability: RuntimeAbility): ReactNode }) {
  const render = (node: AbilityGroupNode, depth: number): ReactNode => <section className="rule-ability-group" data-depth={Math.min(depth, 8)} key={node.path}>
    <h4>{node.label}</h4>
    {node.rows.length ? <ul className="faehigkeiten-liste">{node.rows.map(renderRow)}</ul> : null}
    {node.children.size ? <div className="rule-ability-children">{[...node.children.values()].map(child => render(child, depth + 1))}</div> : null}
  </section>;
  return <>{abilityGroupTree(rows).map(node => render(node, 0))}</>;
}

function collectionDefaults(collection: RuleCollection): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(collection.itemFields).map(([id, field]) => [id, field.default]));
}

export function RulePresentationView({ runtime, preview, values, onChange, disabled = false }: {
  runtime: RuleRuntime;
  preview: RuleRuntimePreview | null;
  values: Readonly<Record<string, Scalar>>;
  onChange(values: Record<string, Scalar>): void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [collectionErrors, setCollectionErrors] = useState<Record<string, string>>({});
  // Invalid drafts must remain repairable. Visibility is authoritative only once the host has
  // successfully validated the whole actor state and evaluated every visibleIf expression.
  const visible = preview?.valid ? new Set(preview.visiblePresentationIds) : null;
  const learned = ruleIdList(runtime.abilityField ? values[runtime.abilityField] : undefined);
  const active = ruleIdList(runtime.conditionField ? values[runtime.conditionField] : undefined);
  const overview = preview?.valid ? preview.abilities : null;
  const learnable = new Set(overview?.learnable ?? []);
  const abilities = runtime.abilities.filter(ability => !learned.includes(ability.id) && `${ability.name} ${ability.group} ${ability.text}`.toLowerCase().includes(search.trim().toLowerCase()));
  const learnedAbilities = learned.map(id => runtime.abilities.find(ability => ability.id === id)).filter((ability): ability is RuntimeAbility => !!ability);
  const setList = (field: string, ids: readonly string[]) => onChange({ ...values, [field]: ids.join(", ") });
  const collectionById = new Map(runtime.collections.map(collection => [collection.id, collection]));
  const vitalById = new Map((preview?.vitals ?? []).map(vital => [vital.id, vital]));
  const computedById = new Map(runtime.computed.map(field => [field.id, field]));
  const actionById = new Map(runtime.actions.map(action => [action.id, action]));

  const collectionNode = (collection: RuleCollection, label: string | undefined, render: string | undefined) => {
    // The host remains authoritative for validity/save permission, but the editor must render the
    // current draft immediately while a new preview is pending. The same frozen rules parser is
    // safe to use locally for that editing projection; an invalid raw value falls through to the
    // repair control below instead of making the collection disappear.
    const storage = runtime.fields[collection.storageField];
    const maxLength = storage?.type === "string" ? storage.maxLength ?? RULE_LIMITS.stringValue : RULE_LIMITS.stringValue;
    const rawValue = values[collection.storageField];
    let rows: Readonly<Record<string, Scalar>>[] = [];
    let needsRepair = typeof rawValue === "string" && rawValue.length > maxLength;
    try { rows = [...decodeRuleCollectionValue(collection, rawValue)]; }
    catch { rows = [...(preview?.collections[collection.id] ?? [])]; needsRepair = true; }
    const setCollectionError = (message: string) => setCollectionErrors(old => {
      if ((old[collection.id] ?? "") === message) return old;
      const next = { ...old };
      if (message) next[collection.id] = message; else delete next[collection.id];
      return next;
    });
    const updateRows = (next: readonly Readonly<Record<string, Scalar>>[]) => {
      try {
        const encoded = encodeRuleCollectionValue(collection, next);
        if (encoded.length > maxLength) {
          setCollectionError(t("Diese Sammlung ist zu groß. Der gespeicherte Wert darf höchstens {max} Zeichen haben.", { max: maxLength }));
          return;
        }
        setCollectionError("");
        onChange({ ...values, [collection.storageField]: encoded });
      } catch (error) {
        setCollectionError(error instanceof Error ? error.message : t("Die Sammlung konnte nicht aktualisiert werden."));
      }
    };
    const body = <>
      {collectionErrors[collection.id] ? <Notice error>{collectionErrors[collection.id]}</Notice> : null}
      {rows.map((row, index) => <article className="rule-collection-row" key={index}>
        <RuleFields fields={collection.itemFields} values={row} disabled={disabled} onChange={next => updateRows(rows.map((old, i) => i === index ? next : old))} />
        <Button variant="quiet" disabled={disabled || rows.length <= collection.minItems} onClick={() => updateRows(rows.filter((_, i) => i !== index))}>{t("Eintrag entfernen")}</Button>
      </article>)}
      <Button disabled={disabled || rows.length >= collection.maxItems} onClick={() => updateRows([...rows, collectionDefaults(collection)])}>{t("Eintrag hinzufügen")}</Button>
      {needsRepair && storage ? <details><summary>{t("Sammlungsdaten reparieren")}</summary>
        <Notice error>{t("Die gespeicherten Sammlungsdaten sind ungültig. Korrigiere den Rohwert oder füge die Sammlung neu auf.")}</Notice>
        <RuleFields fields={{ [collection.storageField]: storage }} values={values} disabled={disabled} onChange={onChange} />
      </details> : null}
    </>;
    return <section className={`rule-collection rule-render-${render ?? "list"}`}><h4>{label ?? collection.label}</h4>{body}</section>;
  };

  const abilitiesNode = (label?: string) => runtime.abilityField && runtime.abilities.length ? <section className="faehigkeiten-bogen">
    <h3>{label ?? t("Fähigkeiten")}</h3>
    {overview ? <p role="status">{overview.budget === null ? t("Ausgegeben: {punkte} Punkte", { punkte: overview.spent }) : t("Ausgegeben: {punkte} von {budget} Punkten", { punkte: overview.spent, budget: overview.budget })}</p> : null}
    <AbilityGroups rows={learnedAbilities} renderRow={ability => <li key={ability.id}><span>{ability.name}</span><Button disabled={disabled} onClick={() => setList(runtime.abilityField!, forgetRuleAbility(runtime, learned, ability.id))}>{t("Verlernen")}</Button></li>} />
    <details><summary>{t("Neue Fähigkeit lernen")}</summary>
      <label>{t("Fähigkeit suchen")}<input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={disabled} /></label>
      <AbilityGroups rows={abilities.slice(0, 40)} renderRow={ability => <li key={ability.id}><div><strong>{ability.name}</strong><small> · {ability.price}</small><p>{ability.text}</p></div><Button disabled={disabled || !learnable.has(ability.id)} onClick={() => { if (learnable.has(ability.id)) setList(runtime.abilityField!, [...learned, ability.id]); }}>{t("Lernen")}</Button></li>} />
      {abilities.length > 40 ? <p>{t("{n} weitere Treffer. Grenze die Suche ein.", { n: abilities.length - 40 })}</p> : !abilities.length ? <p>{t("Keine passende Fähigkeit.")}</p> : null}
    </details>
  </section> : null;

  const renderNode = (node: RulePresentationNode, depth: number): ReactNode => {
    if (visible && !visible.has(node.id)) return null;
    switch (node.kind) {
      case "group": {
        const children = node.children.map(child => renderNode(child, depth + 1)).filter(Boolean);
        if (!children.length) return null;
        const content = <div className={`rule-presentation-group rule-render-${node.render ?? "section"}`} data-depth={Math.min(depth, 8)}>{children}</div>;
        if (node.collapsible) return <details className="sheet-section rule-category" key={node.id} open={!node.collapsed}><summary>{node.label}</summary>{content}</details>;
        return <fieldset className="sheet-section rule-category" data-depth={Math.min(depth, 8)} key={node.id}><legend>{node.label}</legend>{content}</fieldset>;
      }
      case "field": {
        const field = runtime.fields[node.ref]; if (!field) return null;
        const schema = node.label ? { ...field, label: node.label } : field;
        return <div className={`rule-presentation-leaf rule-render-${node.render ?? "compact"}`} key={node.id}><RuleFields fields={{ [node.ref]: schema }} values={values} onChange={onChange} disabled={disabled} /></div>;
      }
      case "computed": {
        const definition = computedById.get(node.ref); if (!definition || !preview?.valid) return null;
        return <dl className={`rule-computed rule-render-${node.render ?? "compact"}`} key={node.id}><div><dt>{node.label ?? definition.label}</dt><dd>{preview.computed[node.ref]}</dd></div></dl>;
      }
      case "vital": {
        const vital = vitalById.get(node.ref); if (!vital) return null;
        return <div className={`rule-vital rule-render-${node.render ?? "compact"}`} key={node.id}><VitalBar vital={vital} label={node.label ?? vital.label} /></div>;
      }
      case "collection": {
        const collection = collectionById.get(node.ref); return collection ? <div key={node.id}>{collectionNode(collection, node.label, node.render)}</div> : null;
      }
      case "abilities": return <div key={node.id}>{abilitiesNode(node.label)}</div>;
      case "conditions": return runtime.conditionField && runtime.conditions.length ? <section key={node.id}><h3>{node.label ?? t("Zustände")}</h3>{runtime.conditions.map(condition => <label key={condition.id} className="check-label"><input type="checkbox" checked={active.includes(condition.id)} disabled={disabled} onChange={event => setList(runtime.conditionField!, event.target.checked ? [...active, condition.id] : active.filter(id => id !== condition.id))} /><span>{condition.name} <small>{condition.text}</small></span></label>)}</section> : null;
      case "actions": {
        const refs = node.refs ?? runtime.actions.map(action => action.id), actions = refs.map(id => actionById.get(id)).filter((action): action is RuleRuntime["actions"][number] => !!action);
        return <section className={`rule-action-list rule-render-${node.render ?? "list"}`} key={node.id}><h3>{node.label ?? t("Proben dieses Regelpakets")}</h3><ul>{actions.map(action => <li key={action.id}><strong>{action.name}</strong>{action.disclosure ? <p>{action.disclosure}</p> : null}</li>)}</ul></section>;
      }
    }
  };

  return <>{runtime.presentation?.root.map(node => renderNode(node, 0))}</>;
}
