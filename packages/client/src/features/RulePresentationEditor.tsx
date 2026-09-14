// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import type { FieldSchema, RuleCollection, RulePresentationGroup, RulePresentationNode, RulePresentationRender, Scalar } from "@chronicle/rules";
import { t } from "../i18n";
import { copyJson, ensurePresentationV3, uniqueId, type RuleDraft } from "./rule-forge-model";

const renders: RulePresentationRender[] = ["section", "grid", "list", "cards", "compact", "table"];
const kinds = ["group", "field", "computed", "vital", "collection", "abilities", "conditions", "actions"] as const;
type NodeKind = typeof kinds[number];

interface FlatNode { node: RulePresentationNode; parentId: string | null; depth: number }
function flatten(nodes: readonly RulePresentationNode[], parentId: string | null = null, depth = 0): FlatNode[] {
  return nodes.flatMap(node => [{ node, parentId, depth }, ...(node.kind === "group" ? flatten(node.children, node.id, depth + 1) : [])]);
}
function mapNode(nodes: readonly RulePresentationNode[], id: string, fn: (node: RulePresentationNode) => RulePresentationNode): RulePresentationNode[] {
  return nodes.map(node => node.id === id ? fn(node) : node.kind === "group" ? { ...node, children: mapNode(node.children, id, fn) } : node);
}
function removeNode(nodes: readonly RulePresentationNode[], id: string): { nodes: RulePresentationNode[]; removed?: RulePresentationNode } {
  let removed: RulePresentationNode | undefined; const out: RulePresentationNode[] = [];
  for (const node of nodes) {
    if (node.id === id) { removed = node; continue; }
    if (node.kind === "group") {
      const nested = removeNode(node.children, id); if (nested.removed) removed = nested.removed;
      out.push({ ...node, children: nested.nodes });
    } else out.push(node);
  }
  return { nodes: out, removed };
}
function insertNode(nodes: readonly RulePresentationNode[], parentId: string | null, node: RulePresentationNode): RulePresentationNode[] {
  if (parentId === null) return [...nodes, node];
  return nodes.map(current => current.kind === "group" && current.id === parentId ? { ...current, children: [...current.children, node] }
    : current.kind === "group" ? { ...current, children: insertNode(current.children, parentId, node) } : current);
}
function descendants(node: RulePresentationNode): Set<string> {
  const ids = new Set<string>(); const visit = (value: RulePresentationNode) => { ids.add(value.id); if (value.kind === "group") value.children.forEach(visit); }; visit(node); return ids;
}
function moveNode(nodes: readonly RulePresentationNode[], id: string, parentId: string | null): RulePresentationNode[] {
  const removed = removeNode(nodes, id); return removed.removed ? insertNode(removed.nodes, parentId, removed.removed) : [...nodes];
}
function replaceSibling(nodes: readonly RulePresentationNode[], id: string, delta: -1 | 1): RulePresentationNode[] {
  const index = nodes.findIndex(node => node.id === id);
  if (index >= 0) { const next = index + delta; if (next < 0 || next >= nodes.length) return [...nodes]; const out = [...nodes]; [out[index], out[next]] = [out[next]!, out[index]!]; return out; }
  return nodes.map(node => node.kind === "group" ? { ...node, children: replaceSibling(node.children, id, delta) } : node);
}
function refsFor(kind: NodeKind, draft: RuleDraft): { id: string; label: string }[] {
  if (kind === "field") return draft.fields.map(row => ({ id: row.id, label: row.label || row.id }));
  if (kind === "computed") return (draft.computed ?? []).map(row => ({ id: row.id, label: row.label }));
  if (kind === "vital") return (draft.vitals ?? []).map(row => ({ id: row.id, label: row.label }));
  if (kind === "collection") return (draft.collections ?? []).map(row => ({ id: row.id, label: row.label }));
  return [];
}
function referenced(flat: readonly FlatNode[], kind: "field" | "computed" | "vital" | "collection", exceptId?: string): Set<string> {
  return new Set(flat.filter(row => row.node.id !== exceptId && row.node.kind === kind).map(row => (row.node as Extract<RulePresentationNode, { ref: string }>).ref));
}
function usedActions(flat: readonly FlatNode[], exceptId?: string): Set<string> {
  return new Set(flat.filter(row => row.node.id !== exceptId && row.node.kind === "actions").flatMap(row => row.node.kind === "actions" ? [...(row.node.refs ?? [])] : []));
}
function availableRefs(kind: NodeKind, draft: RuleDraft, flat: readonly FlatNode[], exceptId?: string): { id: string; label: string }[] {
  if (kind !== "field" && kind !== "computed" && kind !== "vital" && kind !== "collection") return [];
  const used = referenced(flat, kind, exceptId);
  return refsFor(kind, draft).filter(ref => !used.has(ref.id));
}
function collectionField(type: FieldSchema["type"] = "string"): FieldSchema {
  return type === "integer" || type === "number" ? { type, label: t("Wert"), minimum: 0, maximum: 100, default: 0 }
    : type === "boolean" ? { type, label: t("Wert"), default: false }
    : { type: "string", label: t("Wert"), maxLength: 120, default: "" };
}
function boundedNumber(value: number): number { return Math.max(-1e12, Math.min(1e12, Number.isFinite(value) ? value : 0)); }
function numeric(value: string, fallback: number): number { const next = Number(value); return Number.isFinite(next) ? boundedNumber(next) : fallback; }
function withPrimaryField(collection: RuleCollection, primaryField?: string): RuleCollection {
  const { primaryField: _primaryField, ...base } = collection;
  return primaryField ? { ...base, primaryField } : base;
}
function withOptionalNodeText(node: RulePresentationNode, key: "label" | "visibleIf", value: string): RulePresentationNode {
  const { [key]: _old, ...base } = node;
  return (value ? { ...base, [key]: value } : base) as RulePresentationNode;
}
function uniqueStrings(values: readonly string[], maxLength: number): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (const raw of values) {
    const value = raw.slice(0, maxLength);
    if (!value || seen.has(value)) continue;
    seen.add(value); out.push(value);
    if (out.length >= 64) break;
  }
  return out;
}
function normalizedStringField(field: FieldSchema, patch: { maxLength?: number; defaultValue?: string; enumValues?: readonly string[] }): FieldSchema {
  if (field.type !== "string") return field;
  const maxLength = Math.max(1, Math.min(4096, Math.trunc(patch.maxLength ?? field.maxLength ?? 120)));
  const values = uniqueStrings(patch.enumValues ?? field.enum ?? [], maxLength);
  let defaultValue = (patch.defaultValue ?? String(field.default)).slice(0, maxLength);
  if (values.length && !values.includes(defaultValue)) defaultValue = values[0]!;
  return { type: "string", label: field.label, default: defaultValue, maxLength, ...(values.length ? { enum: values } : {}) };
}
function normalizedNumericField(field: FieldSchema, patch: { minimum?: number; maximum?: number; defaultValue?: number }, changed: "minimum" | "maximum" | "default"): FieldSchema {
  if (field.type !== "integer" && field.type !== "number") return field;
  const normalize = (value: number) => field.type === "integer" ? Math.trunc(boundedNumber(value)) : boundedNumber(value);
  let minimum = normalize(patch.minimum ?? field.minimum ?? 0), maximum = normalize(patch.maximum ?? field.maximum ?? 100);
  if (minimum > maximum) {
    if (changed === "minimum") maximum = minimum;
    else minimum = maximum;
  }
  let defaultValue = normalize(patch.defaultValue ?? Number(field.default));
  defaultValue = Math.max(minimum, Math.min(maximum, defaultValue));
  return { type: field.type, label: field.label, default: defaultValue, minimum, maximum };
}
function defaultCollectionRow(collection: RuleCollection): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(collection.itemFields).map(([id, field]) => [id, field.default]));
}
function compatibleValue(field: FieldSchema, value: unknown): Scalar {
  if (field.type === "boolean") return typeof value === "boolean" ? value : field.default;
  if (field.type === "string") return typeof value === "string" && value.length <= (field.maxLength ?? 4096) && (!field.enum || field.enum.includes(value)) ? value : field.default;
  if (typeof value !== "number" || !Number.isFinite(value) || field.type === "integer" && !Number.isSafeInteger(value)) return field.default;
  if (field.minimum !== undefined && value < field.minimum || field.maximum !== undefined && value > field.maximum) return field.default;
  return value;
}
function normalizeCollectionDefault(draft: RuleDraft, collection: RuleCollection, rename?: readonly [string, string]): RuleDraft {
  const storage = draft.fields.find(field => field.id === collection.storageField);
  if (!storage) return draft;
  let raw: unknown = [];
  try { raw = JSON.parse(storage.defaultValue || "[]"); } catch { raw = []; }
  const input = Array.isArray(raw) ? raw.slice(0, collection.maxItems) : [];
  const rows = input.map(item => {
    const source = item !== null && typeof item === "object" && !Array.isArray(item) ? { ...(item as Record<string, unknown>) } : {};
    if (rename && Object.hasOwn(source, rename[0])) { source[rename[1]] = source[rename[0]]; delete source[rename[0]]; }
    return Object.fromEntries(Object.entries(collection.itemFields).map(([id, field]) => [id, compatibleValue(field, source[id])]));
  });
  while (rows.length < collection.minItems) rows.push(defaultCollectionRow(collection));
  const defaultValue = JSON.stringify(rows);
  return { ...draft, fields: draft.fields.map(field => field.id === collection.storageField ? { ...field, defaultValue } : field) };
}
function defaultNode(kind: NodeKind, id: string, draft: RuleDraft, flat: readonly FlatNode[]): RulePresentationNode | null {
  const base = { id, render: "section" as const };
  if (kind === "group") return { kind, ...base, label: t("Neue Kategorie"), children: [] };
  if (kind === "field" || kind === "computed" || kind === "vital" || kind === "collection") {
    const ref = availableRefs(kind, draft, flat)[0]; return ref ? { kind, ...base, ref: ref.id } as RulePresentationNode : null;
  }
  if (kind === "abilities") return (draft.abilities?.length ?? 0) && !flat.some(row => row.node.kind === "abilities") ? { kind, ...base } as RulePresentationNode : null;
  if (kind === "conditions") return (draft.conditions?.length ?? 0) && !flat.some(row => row.node.kind === "conditions") ? { kind, ...base } as RulePresentationNode : null;
  const action = draft.actions.find(candidate => !usedActions(flat).has(candidate.id));
  return kind === "actions" && action ? { kind, ...base, refs: [action.id] } : null;
}

export function RulePresentationEditor({ draft, onChange, disabled = false }: { draft: RuleDraft; onChange(draft: RuleDraft): void; disabled?: boolean }) {
  const prepared = draft.presentation ? draft : ensurePresentationV3(draft);
  const presentation = prepared.presentation!;
  const flat = useMemo(() => flatten(presentation.root), [presentation]);
  const groups = flat.filter(row => row.node.kind === "group");
  const [newKind, setNewKind] = useState<NodeKind>("group"), [newParent, setNewParent] = useState<string>("");
  const commitRoot = (root: RulePresentationNode[]) => onChange({ ...prepared, presentation: { ...presentation, root } });
  const update = (id: string, fn: (node: RulePresentationNode) => RulePresentationNode) => commitRoot(mapNode(presentation.root, id, fn));
  const usedIds = flat.map(row => row.node.id);
  const canAdd = (kind: NodeKind): boolean => kind === "group"
    || (kind === "abilities" ? (prepared.abilities?.length ?? 0) > 0 && !flat.some(row => row.node.kind === "abilities")
    : kind === "conditions" ? (prepared.conditions?.length ?? 0) > 0 && !flat.some(row => row.node.kind === "conditions")
    : kind === "actions" ? prepared.actions.some(action => !usedActions(flat).has(action.id))
    : availableRefs(kind, prepared, flat).length > 0);

  const add = () => {
    const id = uniqueId(newKind === "group" ? "gruppe" : newKind, usedIds);
    const node = defaultNode(newKind, id, prepared, flat); if (!node) return;
    commitRoot(insertNode(presentation.root, newParent || null, node));
  };
  const addCollection = () => {
    const collections = prepared.collections ?? [];
    const id = uniqueId("sammlung", collections.map(row => row.id));
    const storageId = uniqueId(`${id}_daten`, prepared.fields.map(field => field.id));
    const storage = { localId: `collection-${Date.now()}-${storageId}`, id: storageId, label: `${id} Daten`, type: "string" as const, defaultValue: "[]", minimum: "0", maximum: "20", maxLength: "4096", hasEnum: false, enumValues: [] };
    const collection: RuleCollection = { id, label: t("Neue Sammlung"), storageField: storageId, itemFields: { name: { type: "string", label: t("Name"), maxLength: 120, default: "" } }, minItems: 0, maxItems: 64, primaryField: "name" };
    const next = { ...prepared, schemaVersion: 2 as const, fields: [...prepared.fields, storage], collections: [...collections, collection] };
    const node: RulePresentationNode = { kind: "collection", id: uniqueId("collection", usedIds), ref: id, render: "table" };
    onChange({ ...next, presentation: { ...presentation, root: insertNode(presentation.root, newParent || null, node) } });
  };
  const replaceCollection = (index: number, nextCollection: RuleCollection, rename?: readonly [string, string]) => {
    const next = { ...prepared, collections: prepared.collections!.map((row, i) => i === index ? nextCollection : row) };
    onChange(normalizeCollectionDefault(next, nextCollection, rename));
  };

  return <section className="rf-presentation-editor">
    {!draft.presentation ? <Notice>{t("Dieses Paket verwendet noch den klassischen Bogen. Beim ersten Ändern wird seine bestehende Abschnittsstruktur verlustfrei in Presentation v3 übernommen.")}</Notice> : null}
    <div className="rf-section-heading"><div><h3>{t("Dynamische Oberfläche")}</h3><p className="rf-help">{t("Ein Baum steuert Character Sheet, Vorlagen und Vorschau. Gruppen dürfen beliebig verschachtelt werden; jeder Eintrag kann eine Sichtbarkeitsformel und einen Darstellungsmodus erhalten.")}</p></div></div>
    <fieldset disabled={disabled}><legend>{t("Neuen UI-Baustein einfügen")}</legend><div className="rf-form-grid">
      <label>{t("Baustein")}<select value={newKind} onChange={event => setNewKind(event.target.value as NodeKind)}>{kinds.map(kind => <option key={kind} value={kind} disabled={!canAdd(kind)}>{kind}</option>)}</select></label>
      <label>{t("In Kategorie")}<select value={newParent} onChange={event => setNewParent(event.target.value)}><option value="">{t("Oberste Ebene")}</option>{groups.map(row => <option key={row.node.id} value={row.node.id}>{"— ".repeat(row.depth)}{row.node.label ?? row.node.id}</option>)}</select></label>
    </div><div className="button-row"><Button disabled={!canAdd(newKind)} onClick={add}><Plus size={14} />{t("Baustein hinzufügen")}</Button><Button onClick={addCollection}><Plus size={14} />{t("Collection hinzufügen")}</Button></div></fieldset>

    <div className="rf-presentation-tree">{flat.map(({ node, parentId, depth }) => {
      const blockedParents = descendants(node);
      const refs = availableRefs(node.kind, prepared, flat, node.id);
      const unavailableActions = node.kind === "actions" ? usedActions(flat, node.id) : new Set<string>();
      return <article className="rf-card" key={node.id} style={{ marginLeft: `${Math.min(depth, 8) * 16}px` }}><div className="rf-section-heading"><div><strong>{node.kind} · {node.label ?? ("ref" in node ? node.ref : node.id)}</strong><small>{node.id}</small></div><div className="button-row"><Button variant="quiet" onClick={() => commitRoot(replaceSibling(presentation.root, node.id, -1))}>↑</Button><Button variant="quiet" onClick={() => commitRoot(replaceSibling(presentation.root, node.id, 1))}>↓</Button><Button variant="quiet" onClick={() => commitRoot(removeNode(presentation.root, node.id).nodes)}><Trash2 size={14} /></Button></div></div>
        <div className="rf-form-grid">
          <label>{t("Label (optional)")}<input value={node.label ?? ""} maxLength={120} onChange={event => update(node.id, current => withOptionalNodeText(current, "label", event.target.value))} /></label>
          <label>{t("Darstellung")}<select value={node.render ?? "section"} onChange={event => update(node.id, current => ({ ...current, render: event.target.value as RulePresentationRender } as RulePresentationNode))}>{renders.map(render => <option key={render}>{render}</option>)}</select></label>
          <label>{t("Sichtbar wenn")}<input value={node.visibleIf ?? ""} placeholder="actor.level >= 2" onChange={event => update(node.id, current => withOptionalNodeText(current, "visibleIf", event.target.value))} /><small>{t("Boolesche Formel ohne Würfel; leer bedeutet immer sichtbar.")}</small></label>
          <label>{t("Übergeordnete Kategorie")}<select value={parentId ?? ""} onChange={event => commitRoot(moveNode(presentation.root, node.id, event.target.value || null))}><option value="">{t("Oberste Ebene")}</option>{groups.filter(group => !blockedParents.has(group.node.id)).map(group => <option key={group.node.id} value={group.node.id}>{group.node.label ?? group.node.id}</option>)}</select></label>
        </div>
        {"ref" in node ? <label>{t("Referenz")}<select value={node.ref} onChange={event => update(node.id, current => ({ ...current, ref: event.target.value } as RulePresentationNode))}>{refs.map(ref => <option key={ref.id} value={ref.id}>{ref.label} · {ref.id}</option>)}</select></label> : null}
        {node.kind === "group" ? <div className="button-row"><label className="rf-check"><input type="checkbox" checked={node.collapsible ?? false} onChange={event => update(node.id, current => ({ ...(current as RulePresentationGroup), collapsible: event.target.checked, ...(event.target.checked ? {} : { collapsed: false }) }))} />{t("Einklappbar")}</label>{node.collapsible ? <label className="rf-check"><input type="checkbox" checked={node.collapsed ?? false} onChange={event => update(node.id, current => ({ ...(current as RulePresentationGroup), collapsed: event.target.checked }))} />{t("Standardmäßig eingeklappt")}</label> : null}</div> : null}
        {node.kind === "actions" ? <fieldset><legend>{t("Aktionen in diesem Block")}</legend>{prepared.actions.map(action => { const checked = (node.refs ?? []).includes(action.id); return <label className="rf-check" key={action.id}><input type="checkbox" checked={checked} disabled={!checked && unavailableActions.has(action.id) || checked && (node.refs?.length ?? 0) <= 1} onChange={event => update(node.id, current => { const row = current.kind === "actions" ? current : node; const currentRefs = row.refs ?? []; return { ...row, refs: event.target.checked ? [...currentRefs, action.id] : currentRefs.filter(id => id !== action.id) }; })} />{action.name}</label>; })}</fieldset> : null}
      </article>;
    })}</div>

    <h3>{t("Collections")}</h3><p className="rf-help">{t("Collections sind wiederholbare Listen wie Waffen, Zauber, Sprachen, Angriffe oder Sonderfertigkeiten. Ihre Daten liegen in einem normalen gepinnten Bogenfeld und bleiben damit Teil derselben Versions- und Migrationslogik.")}</p>
    {(prepared.collections ?? []).map((collection, index) => <fieldset className="rf-card" key={collection.id} disabled={disabled}><legend>{collection.label}</legend><div className="rf-form-grid">
      <label>{t("Kennung")}<input value={collection.id} onChange={event => { const id = event.target.value; onChange({ ...prepared, collections: prepared.collections!.map((row, i) => i === index ? { ...row, id } : row), presentation: { ...presentation, root: mapNode(presentation.root, flat.find(row => row.node.kind === "collection" && row.node.ref === collection.id)?.node.id ?? "", node => node.kind === "collection" ? { ...node, ref: id } : node) } }); }} /></label>
      <label>{t("Name")}<input value={collection.label} onChange={event => replaceCollection(index, { ...collection, label: event.target.value })} /></label>
      <label>{t("Minimale Einträge")}<input type="number" min={0} max={collection.maxItems} value={collection.minItems} onChange={event => replaceCollection(index, { ...collection, minItems: Math.max(0, Math.min(collection.maxItems, event.target.valueAsNumber || 0)) })} /></label>
      <label>{t("Maximale Einträge")}<input type="number" min={Math.max(1, collection.minItems)} max={128} value={collection.maxItems} onChange={event => replaceCollection(index, { ...collection, maxItems: Math.max(Math.max(1, collection.minItems), Math.min(128, event.target.valueAsNumber || 1)) })} /></label>
      <label>{t("Hauptfeld")}<select value={collection.primaryField ?? ""} onChange={event => replaceCollection(index, withPrimaryField(collection, event.target.value || undefined))}><option value="">—</option>{Object.keys(collection.itemFields).map(id => <option key={id}>{id}</option>)}</select></label>
    </div>
      {Object.entries(collection.itemFields).map(([id, field]) => <div className="rf-card" key={id}><div className="rf-form-grid">
        <label>{t("Feldkennung")}<input value={id} onChange={event => { const nextId = event.target.value; const itemFields = Object.fromEntries(Object.entries(collection.itemFields).map(([key, value]) => [key === id ? nextId : key, value])); const nextCollection = withPrimaryField({ ...collection, itemFields }, collection.primaryField === id ? nextId : collection.primaryField); replaceCollection(index, nextCollection, [id, nextId]); }} /></label>
        <label>{t("Label")}<input value={field.label} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: { ...field, label: event.target.value } } })} /></label>
        <label>{t("Typ")}<select value={field.type} onChange={event => { const type = event.target.value as FieldSchema["type"]; replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: collectionField(type) } }); }}><option value="string">Text</option><option value="integer">Integer</option><option value="number">Number</option><option value="boolean">Boolean</option></select></label>
        {field.type === "boolean" ? <label className="rf-check"><input type="checkbox" checked={field.default as boolean} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: { ...field, default: event.target.checked } } })} />{t("Vorgabe")}</label>
          : field.type === "string" ? <><label>{t("Vorgabe")}{field.enum?.length ? <select value={field.default as string} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { defaultValue: event.target.value }) } })}>{field.enum.map(value => <option key={value}>{value}</option>)}</select> : <input value={field.default as string} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { defaultValue: event.target.value }) } })} />}</label><label>{t("Zeichenlimit")}<input type="number" min={1} max={4096} value={field.maxLength} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { maxLength: event.target.valueAsNumber || 1 }) } })} /></label><label>{t("Auswahlwerte (Komma)")}<input value={field.enum?.join(", ") ?? ""} onChange={event => { const enumValues = event.target.value.split(",").map(value => value.trim()).filter(Boolean); replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { enumValues }) } }); }} /></label></>
          : <><label>{t("Vorgabe")}<input type="number" value={field.default as number} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedNumericField(field, { defaultValue: numeric(event.target.value, field.default as number) }, "default") } })} /></label><label>{t("Minimum")}<input type="number" value={field.minimum} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedNumericField(field, { minimum: numeric(event.target.value, field.minimum!) }, "minimum") } })} /></label><label>{t("Maximum")}<input type="number" value={field.maximum} onChange={event => replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: normalizedNumericField(field, { maximum: numeric(event.target.value, field.maximum!) }, "maximum") } })} /></label></>}
      </div><Button variant="quiet" disabled={Object.keys(collection.itemFields).length <= 1} onClick={() => { const itemFields = copyJson(collection.itemFields) as Record<string, FieldSchema>; delete itemFields[id]; const nextCollection = withPrimaryField({ ...collection, itemFields }, collection.primaryField === id ? undefined : collection.primaryField); replaceCollection(index, nextCollection); }}><Trash2 size={14} />{t("Feld entfernen")}</Button></div>)}
      <Button onClick={() => { const id = uniqueId("feld", Object.keys(collection.itemFields)); replaceCollection(index, { ...collection, itemFields: { ...collection.itemFields, [id]: collectionField() } }); }}><Plus size={14} />{t("Collection-Feld")}</Button>
      <Button variant="danger" onClick={() => { const storage = collection.storageField; onChange({ ...prepared, collections: prepared.collections!.filter((_, i) => i !== index), fields: prepared.fields.filter(field => field.id !== storage), presentation: { ...presentation, root: removeNode(presentation.root, flat.find(row => row.node.kind === "collection" && row.node.ref === collection.id)?.node.id ?? "").nodes } }); }}><Trash2 size={14} />{t("Collection entfernen")}</Button>
    </fieldset>)}
  </section>;
}
