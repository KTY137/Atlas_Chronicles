// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId, useState, type ReactNode } from "react";
import { RULE_LIMITS, decodeRuleCollectionValue, encodeRuleCollectionValue, type RuleCollection, type RulePresentationNode, type RuleRuntime, type RuleRuntimePreview, type Scalar } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { Begriff } from "./Begriff";
import { RuleFields } from "./RuleFields";
import { VitalBar } from "./Vitalanzeige";
import { learnBlock, showsField, showsValues, type LearnBlock, type RuleFieldsPart } from "./rule-fields-model";
import { forgetRuleAbility, ruleIdList } from "./rule-runtime-state";
import "./rule-categories.css";
import "./rule-fields.css";

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
    {node.rows.length ? <ul className="ability-cards">{node.rows.map(renderRow)}</ul> : null}
    {node.children.size ? <div className="rule-ability-children">{[...node.children.values()].map(child => render(child, depth + 1))}</div> : null}
  </section>;
  return <>{abilityGroupTree(rows).map(node => render(node, 0))}</>;
}

function learnBlockText(block: LearnBlock): string {
  switch (block.art) {
    case "bogen": return t("Erst die Fehler im Bogen beheben.");
    case "vorstufe": return t("Braucht zuerst: {namen}.", { namen: block.fehlend.join(", ") });
    case "punkte": return t("Zu wenig Punkte übrig (Kosten {kosten}, übrig {rest}).", { kosten: block.kosten, rest: block.rest });
    case "sonst": return t("Dafür fehlen Punkte oder eine Voraussetzung.");
  }
}

interface SheetBlockProps {
  runtime: RuleRuntime;
  values: Readonly<Record<string, Scalar>>;
  onChange(values: Record<string, Scalar>): void;
  disabled?: boolean;
  /** Die Beschriftung aus dem Bogenaufbau des Regelwerks; ohne sie gilt die Standardüberschrift. */
  label?: string | undefined;
}

/**
 * Fähigkeiten als Karten (Spec E3). Jeder Knopf sagt, was er tut („Kraftschlag lernen“); ein gesperrter
 * Lernknopf nennt seinen Grund und ist mit ihm verbunden. Eine leere Liste sagt, was hineingehört.
 * Beispiele gibt es nur in der Regelschmiede, nicht auf dem Bogen einer Figur.
 */
export function SheetAbilities({ runtime, preview, values, onChange, disabled = false, label, regionLabel }: SheetBlockProps & { preview: RuleRuntimePreview | null; regionLabel?: string }) {
  const [search, setSearch] = useState(""), prefix = useId();
  const field = runtime.abilityField;
  if (!field || !runtime.abilities.length) return null;
  const learned = ruleIdList(values[field]);
  const overview = preview?.valid ? preview.abilities : null;
  const needle = search.trim().toLowerCase();
  const open = runtime.abilities.filter(ability => !learned.includes(ability.id) && `${ability.name} ${ability.group} ${ability.text}`.toLowerCase().includes(needle));
  const learnedAbilities = learned.map(id => runtime.abilities.find(ability => ability.id === id)).filter((ability): ability is RuntimeAbility => !!ability);
  const setList = (ids: readonly string[]) => onChange({ ...values, [field]: ids.join(", ") });
  const blockedId = `${prefix}-bogen`;
  return <section className="faehigkeiten-bogen sheet-block" aria-label={regionLabel}>
    <h3>{label ?? t("Fähigkeiten")}</h3>
    {overview ? <p className="field-help" role="status">{overview.budget === null ? t("Ausgegeben: {punkte} Punkte", { punkte: overview.spent }) : t("Ausgegeben: {punkte} von {budget} Punkten", { punkte: overview.spent, budget: overview.budget })}</p> : null}
    {learnedAbilities.length ? <AbilityGroups rows={learnedAbilities} renderRow={ability => <li key={ability.id} className="ability-card is-learned">
      <strong className="ability-card-name">{ability.name}</strong>
      {ability.text ? <p>{ability.text}</p> : null}
      <Button disabled={disabled} onClick={() => setList(forgetRuleAbility(runtime, learned, ability.id))}>{t("{name} verlernen", { name: ability.name })}</Button>
    </li>} /> : <p className="ability-empty"><Begriff id="faehigkeit">{t("Noch keine Fähigkeit gelernt.")}</Begriff> {t("Unter „Neue Fähigkeit lernen“ suchst du eine aus.")}</p>}
    <details><summary>{t("Neue Fähigkeit lernen")}</summary>
      <div className="ability-search"><label>{t("Fähigkeit suchen")}<input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={disabled} /></label></div>
      {!overview ? <p id={blockedId} className="field-help">{t("Erst die Fehler im Bogen beheben.")}</p> : null}
      <AbilityGroups rows={open.slice(0, 40)} renderRow={ability => {
        const block = learnBlock(runtime, learned, overview, ability.id), reasonId = block?.art === "bogen" ? blockedId : `${prefix}-${ability.id}-grund`;
        return <li key={ability.id} className="ability-card">
          <strong className="ability-card-name">{ability.name}</strong>
          {ability.price ? <span className="ability-card-meta">{t("Kosten: {n}", { n: ability.price })}</span> : null}
          {ability.text ? <p>{ability.text}</p> : null}
          {block && block.art !== "bogen" ? <p id={reasonId} className="ability-card-reason">{learnBlockText(block)}</p> : null}
          <Button disabled={disabled || block !== null} aria-describedby={block ? reasonId : undefined} onClick={() => { if (!block) setList([...learned, ability.id]); }}>{t("{name} lernen", { name: ability.name })}</Button>
        </li>;
      }} />
      {open.length > 40 ? <p className="field-help">{t("{n} weitere Treffer. Grenze die Suche ein.", { n: open.length - 40 })}</p> : !open.length ? <p className="field-help">{t("Keine passende Fähigkeit.")}</p> : null}
    </details>
  </section>;
}

/** Zustände als Umschalt-Chips; was ein Zustand bewirkt, steht darunter und ist mit dem Kästchen verbunden. */
export function SheetConditions({ runtime, values, onChange, disabled = false, label }: SheetBlockProps) {
  const prefix = useId();
  const field = runtime.conditionField;
  if (!field || !runtime.conditions.length) return null;
  const active = ruleIdList(values[field]);
  const setList = (ids: readonly string[]) => onChange({ ...values, [field]: ids.join(", ") });
  return <section className="sheet-block sheet-conditions">
    <h3><Begriff id="zustand">{label ?? t("Zustände")}</Begriff></h3>
    <p>{t("Hake an, was die Figur gerade betrifft. Aktive Zustände wirken bei jedem passenden Wurf mit.")}</p>
    <div className="condition-chips">{runtime.conditions.map(condition => {
      const on = active.includes(condition.id), textId = `${prefix}-${condition.id}`;
      return <div className="condition-chip-item" key={condition.id}>
        <label className={on ? "condition-chip is-active" : "condition-chip"}><input type="checkbox" checked={on} disabled={disabled} aria-describedby={condition.text ? textId : undefined}
          onChange={event => setList(event.target.checked ? [...active, condition.id] : active.filter(id => id !== condition.id))} /><span>{condition.name}</span></label>
        {condition.text ? <p id={textId} className="field-help">{condition.text}</p> : null}
      </div>;
    })}</div>
  </section>;
}

function collectionDefaults(collection: RuleCollection): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(collection.itemFields).map(([id, field]) => [id, field.default]));
}

/**
 * Der Bogen nach dem Bogenaufbau (v3) des Regelwerks. Der Baum ist die eine Wahrheit: die Reihenfolge
 * der Autorin bleibt, hier ändert sich nur, wie jeder Knoten aussieht. `part` und `omit` lassen Knoten
 * weg; eine Gruppe, der dabei alle Kinder abhandenkommen, verschwindet ganz.
 */
export function RulePresentationView({ runtime, preview, values, onChange, disabled = false, part = "all", omit }: {
  runtime: RuleRuntime;
  preview: RuleRuntimePreview | null;
  values: Readonly<Record<string, Scalar>>;
  onChange(values: Record<string, Scalar>): void;
  disabled?: boolean;
  part?: RuleFieldsPart;
  omit?: readonly string[];
}) {
  const [collectionErrors, setCollectionErrors] = useState<Record<string, string>>({});
  // Invalid drafts must remain repairable. Visibility is authoritative only once the host has
  // successfully validated the whole actor state and evaluated every visibleIf expression.
  const visible = preview?.valid ? new Set(preview.visiblePresentationIds) : null;
  const withValues = showsValues(part);
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
          setCollectionError(t("Diese Liste ist zu lang. Gespeichert werden höchstens {max} Zeichen.", { max: maxLength }));
          return;
        }
        setCollectionError("");
        onChange({ ...values, [collection.storageField]: encoded });
      } catch {
        setCollectionError(t("Die Liste ließ sich nicht ändern."));
      }
    };
    return <section className={`rule-collection rule-render-${render ?? "list"}`}><h4>{label ?? collection.label}</h4>
      {collectionErrors[collection.id] ? <Notice error>{collectionErrors[collection.id]}</Notice> : null}
      {rows.map((row, index) => <article className="rule-collection-row" key={index}>
        <RuleFields fields={collection.itemFields} values={row} disabled={disabled} onChange={next => updateRows(rows.map((old, i) => i === index ? next : old))} />
        <Button variant="quiet" disabled={disabled || rows.length <= collection.minItems} onClick={() => updateRows(rows.filter((_, i) => i !== index))}>{t("Eintrag entfernen")}</Button>
      </article>)}
      <Button disabled={disabled || rows.length >= collection.maxItems} onClick={() => updateRows([...rows, collectionDefaults(collection)])}>{t("Eintrag hinzufügen")}</Button>
      {needsRepair && storage ? <details><summary>{t("Gespeicherte Liste reparieren")}</summary>
        <Notice error>{t("Diese gespeicherte Liste lässt sich nicht lesen. Korrigiere den gespeicherten Text oder leere ihn und lege die Einträge neu an.")}</Notice>
        <RuleFields fields={{ [collection.storageField]: storage }} values={values} disabled={disabled} onChange={onChange} />
      </details> : null}
    </section>;
  };

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
        const field = runtime.fields[node.ref];
        if (!field || !showsField(node.ref, field, part, omit, runtime)) return null;
        const schema = node.label ? { ...field, label: node.label } : field;
        const wide = field.type === "string" && !field.enum;
        return <div className={`rule-presentation-leaf rule-render-${node.render ?? "compact"}${wide ? " is-wide" : ""}`} key={node.id}><RuleFields fields={{ [node.ref]: schema }} values={values} onChange={onChange} disabled={disabled} /></div>;
      }
      case "computed": {
        const definition = computedById.get(node.ref); if (!withValues || !definition || !preview?.valid) return null;
        return <dl className={`rule-computed stat-tiles rule-render-${node.render ?? "compact"}`} key={node.id}><div className="stat-tile"><dt>{node.label ?? definition.label}</dt><dd>{preview.computed[node.ref]}</dd></div></dl>;
      }
      case "vital": {
        const vital = vitalById.get(node.ref); if (!withValues || !vital) return null;
        return <div className={`rule-vital is-wide rule-render-${node.render ?? "compact"}`} key={node.id}><VitalBar vital={vital} label={node.label ?? vital.label} /></div>;
      }
      case "collection": {
        const collection = collectionById.get(node.ref); if (!withValues || !collection) return null;
        return <div className="rule-presentation-block is-wide" key={node.id}>{collectionNode(collection, node.label, node.render)}</div>;
      }
      case "abilities":
        return withValues && runtime.abilityField && runtime.abilities.length ? <div className="rule-presentation-block is-wide" key={node.id}>
          <SheetAbilities runtime={runtime} preview={preview} values={values} onChange={onChange} disabled={disabled} label={node.label} />
        </div> : null;
      case "conditions":
        return withValues && runtime.conditionField && runtime.conditions.length ? <div className="rule-presentation-block is-wide" key={node.id}>
          <SheetConditions runtime={runtime} values={values} onChange={onChange} disabled={disabled} label={node.label} />
        </div> : null;
      case "actions": {
        if (!withValues) return null;
        const refs = node.refs ?? runtime.actions.map(action => action.id), actions = refs.map(id => actionById.get(id)).filter((action): action is RuleRuntime["actions"][number] => !!action);
        if (!actions.length) return null;
        // Lange Probenlisten klappen zu: am Bogen zählen die Werte, die Probe würfelt man am Tisch.
        return <details className={`rule-action-list is-wide rule-render-${node.render ?? "list"}`} key={node.id} open={actions.length <= 4}>
          <summary>{node.label ?? t("Proben dieses Regelwerks")} <span className="rule-action-count">({actions.length})</span></summary>
          <ul>{actions.map(action => <li key={action.id}><strong>{action.name}</strong>{action.disclosure ? <p>{action.disclosure}</p> : null}</li>)}</ul>
        </details>;
      }
    }
  };

  return <>{runtime.presentation?.root.map(node => renderNode(node, 0))}</>;
}
