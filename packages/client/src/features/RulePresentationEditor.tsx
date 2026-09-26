// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, FolderPlus, Plus, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { RULE_LIMITS, type RulePresentationGroup, type RulePresentationNode, type RulePresentationRender } from "@chronicle/rules";
import { t } from "../i18n";
import { desugarFormula, resugarFormula } from "./formula-sugar";
import { uniqueId, type RuleDraft } from "./rule-forge-model";
import { allNodeIds, sheetTree, uniqueNodeId, withSheetTree } from "./rule-sheet-model";

const renders: RulePresentationRender[] = ["section", "grid", "list", "cards", "compact", "table"];
type NodeKind = RulePresentationNode["kind"];
type RefKind = "field" | "computed" | "vital" | "collection";

export function kindLabel(kind: NodeKind): string {
  switch (kind) {
    case "group": return t("Kategorie"); case "field": return t("Attribut"); case "computed": return t("Abgeleiteter Wert"); case "vital": return t("Balken");
    case "collection": return t("Liste"); case "abilities": return t("Fähigkeiten"); case "conditions": return t("Zustände"); case "actions": return t("Aktionen");
  }
}
function renderLabel(render: RulePresentationRender): string {
  switch (render) {
    case "section": return t("Abschnitt"); case "grid": return t("Raster"); case "list": return t("Liste"); case "cards": return t("Karten"); case "compact": return t("Kompakt"); case "table": return t("Tabelle");
  }
}

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
/** Eine Kategorie auflösen: ihr Inhalt rückt an ihre Stelle, statt mit ihr vom Bogen zu verschwinden. */
function unwrapGroup(nodes: readonly RulePresentationNode[], id: string): RulePresentationNode[] {
  return nodes.flatMap(node => node.id === id && node.kind === "group" ? [...node.children] : node.kind === "group" ? [{ ...node, children: unwrapGroup(node.children, id) }] : [node]);
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
function referenced(flat: readonly FlatNode[], kind: RefKind, exceptId?: string): Set<string> {
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
function withOptionalNodeText(node: RulePresentationNode, key: "label" | "visibleIf", value: string): RulePresentationNode {
  const { [key]: _old, ...base } = node;
  return (value ? { ...base, [key]: value } : base) as RulePresentationNode;
}
function nodeName(node: RulePresentationNode, draft: RuleDraft): string {
  if (node.label) return node.label;
  if ("ref" in node) return refsFor(node.kind, draft).find(ref => ref.id === node.ref)?.label ?? node.ref;
  return kindLabel(node.kind);
}

/** „Nur zeigen, wenn“ in derselben Schreibweise wie jede Formel: @attribut statt der gespeicherten Form. */
function VisibleIfInput({ value, onChange }: { value: string; onChange(value: string): void }) {
  const [text, setText] = useState(() => resugarFormula(value));
  return <label>{t("Nur zeigen, wenn")}<input value={text} spellCheck={false} onChange={event => { setText(event.target.value); onChange(event.target.value.trim() ? desugarFormula(event.target.value).canonical : ""); }} /><small>{t("Eine Bedingung ohne Würfel, zum Beispiel @stufe >= 2. Leer heißt: immer sichtbar.")}</small></label>;
}

/**
 * Der eine Bogen-Editor. Links der Aufbau als eingerückte Zeilen, in der Mitte der gewählte
 * Eintrag, rechts der Bogen der ersten Testfigur (`preview`). Jede Änderung geht über
 * `withSheetTree`: ab dann gilt dieser Baum, und die älteren Bogenabschnitte folgen ihm.
 */
export function RuleSheetEditor({ draft, onChange, disabled = false, preview }: { draft: RuleDraft; onChange(draft: RuleDraft): void; disabled?: boolean; preview?: ReactNode }) {
  const root = sheetTree(draft);
  const flat = useMemo(() => flatten(root), [root]);
  const groups = flat.filter(row => row.node.kind === "group");
  const [selectedId, setSelectedId] = useState(""), [target, setTarget] = useState("");
  const selected = flat.find(row => row.node.id === selectedId) ?? flat[0];
  const parentForNew = groups.some(row => row.node.id === target) ? target : null;
  const commitRoot = (next: RulePresentationNode[]) => onChange(withSheetTree(draft, next));
  const update = (id: string, fn: (node: RulePresentationNode) => RulePresentationNode) => commitRoot(mapNode(root, id, fn));
  const usedIds = allNodeIds(root);
  const canAdd = (kind: NodeKind): boolean => kind === "group"
    || (kind === "abilities" ? (draft.abilities?.length ?? 0) > 0 && !flat.some(row => row.node.kind === "abilities")
    : kind === "conditions" ? (draft.conditions?.length ?? 0) > 0 && !flat.some(row => row.node.kind === "conditions")
    : kind === "actions" ? draft.actions.some(action => !usedActions(flat).has(action.id))
    : availableRefs(kind, draft, flat).length > 0);
  const add = (node: RulePresentationNode) => { commitRoot(insertNode(root, parentForNew, node)); setSelectedId(node.id); };
  const addGroup = () => add({ kind: "group", id: uniqueId("gruppe", usedIds), label: t("Neue Kategorie"), render: "section", children: [] });
  const addActions = () => { const action = draft.actions.find(candidate => !usedActions(flat).has(candidate.id)); if (action) add({ kind: "actions", id: uniqueId("aktionen", usedIds), refs: [action.id] }); };
  const unplaced = (["field", "computed", "vital", "collection"] as const).flatMap(kind => availableRefs(kind, draft, flat).map(ref => ({ kind, ...ref })));
  const remove = (row: FlatNode) => { commitRoot(row.node.kind === "group" ? unwrapGroup(root, row.node.id) : removeNode(root, row.node.id).nodes); setSelectedId(""); };

  const node = selected?.node;
  const blockedParents = node ? descendants(node) : new Set<string>();
  const refs = node ? availableRefs(node.kind, draft, flat, node.id) : [];
  const unavailableActions = node?.kind === "actions" ? usedActions(flat, node.id) : new Set<string>();
  return <section className="rf-sheet-editor" aria-label={t("Aufbau des Charakterbogens")}>
    {!draft.presentation ? <Notice>{t("Dieses Paket verwendet noch den klassischen Bogen. Beim ersten Ändern wird seine Abschnittsstruktur verlustfrei übernommen und das Paket auf das erweiterte Format umgestellt.")}</Notice> : null}
    <div className="rf-sheet-layout">
      <nav className="rf-list rf-sheet-tree" aria-label={t("Aufbau des Bogens")}>
        <div className="rf-section-heading"><h3>{t("Aufbau")}</h3></div>
        <p className="rf-help">{t("So steht alles auf dem Charakterbogen, von oben nach unten. Kategorien lassen sich beliebig ineinander legen.")}</p>
        <ul>{flat.map(row => <li key={row.node.id}><button type="button" data-kind={row.node.kind} style={{ paddingLeft: `${10 + Math.min(row.depth, 8) * 16}px` }} aria-current={row.node.id === node?.id ? "true" : undefined} onClick={() => setSelectedId(row.node.id)}>
          <strong>{nodeName(row.node, draft)}</strong><small>{kindLabel(row.node.kind)}{row.node.visibleIf ? ` · ${t("nur unter einer Bedingung")}` : ""}</small></button></li>)}</ul>
        <fieldset className="rf-sheet-add" disabled={disabled}><legend>{t("Hinzufügen")}</legend>
          <label>{t("Einfügen in")}<select value={parentForNew ?? ""} onChange={event => setTarget(event.target.value)}><option value="">{t("Oberste Ebene")}</option>{groups.map(row => <option key={row.node.id} value={row.node.id}>{"— ".repeat(row.depth)}{nodeName(row.node, draft)}</option>)}</select></label>
          <div className="button-row"><Button onClick={addGroup}><FolderPlus size={14} />{t("Kategorie")}</Button>
            {canAdd("actions") ? <Button onClick={addActions}><Plus size={14} />{t("Aktionen")}</Button> : null}
            {canAdd("abilities") ? <Button onClick={() => add({ kind: "abilities", id: uniqueId("faehigkeiten", usedIds) })}><Plus size={14} />{t("Fähigkeiten")}</Button> : null}
            {canAdd("conditions") ? <Button onClick={() => add({ kind: "conditions", id: uniqueId("zustaende", usedIds) })}><Plus size={14} />{t("Zustände")}</Button> : null}</div>
          {unplaced.length ? <><p className="rf-help">{t("Noch nicht auf dem Bogen:")}</p><div className="rf-chip-row">{unplaced.map(ref => <Button key={`${ref.kind}:${ref.id}`} variant="quiet" onClick={() => add({ kind: ref.kind, id: uniqueNodeId(`${ref.kind}-${ref.id}`, usedIds), ref: ref.id } as RulePresentationNode)}><Plus size={13} />{t("{name} ({art})", { name: ref.label, art: kindLabel(ref.kind) })}</Button>)}</div></> : <p className="rf-help">{t("Alles liegt auf dem Bogen.")}</p>}
        </fieldset>
      </nav>

      {node && selected ? <section className="rf-detail" aria-label={t("Eintrag auf dem Bogen")}><fieldset className="rf-editor-fields" disabled={disabled}>
        <div className="rf-section-heading"><h4>{t("{art}: {name}", { art: kindLabel(node.kind), name: nodeName(node, draft) })}</h4><span className="rf-toolbar"><span className="rf-order"><Button variant="quiet" aria-label={t("Nach oben verschieben")} onClick={() => commitRoot(replaceSibling(root, node.id, -1))}><ArrowUp size={14} /></Button><Button variant="quiet" aria-label={t("Nach unten verschieben")} onClick={() => commitRoot(replaceSibling(root, node.id, 1))}><ArrowDown size={14} /></Button></span>
          <Button variant="quiet" disabled={flat.length <= 1} onClick={() => remove(selected)}><Trash2 size={14} />{node.kind === "group" ? t("Kategorie auflösen") : t("Vom Bogen nehmen")}</Button></span></div>
        {node.kind === "group" ? <p className="rf-help">{t("Auflösen nimmt nur die Kategorie weg; ihr Inhalt rückt an ihre Stelle.")}</p> : null}
        <div className="rf-form-grid">
          <label>{node.kind === "group" ? t("Titel") : t("Beschriftung (optional)")}<input value={node.label ?? ""} maxLength={RULE_LIMITS.label} onChange={event => update(node.id, current => current.kind === "group" ? { ...current, label: event.target.value } : withOptionalNodeText(current, "label", event.target.value))} />{node.kind !== "group" ? <small>{t("Leer heißt: der Name aus dem Regelwerk.")}</small> : null}</label>
          <label>{t("Darstellung")}<select value={node.render ?? "section"} onChange={event => update(node.id, current => ({ ...current, render: event.target.value as RulePresentationRender } as RulePresentationNode))}>{renders.map(render => <option key={render} value={render}>{renderLabel(render)}</option>)}</select></label>
          <label>{t("Kategorie")}<select value={selected.parentId ?? ""} onChange={event => commitRoot(moveNode(root, node.id, event.target.value || null))}><option value="">{t("Oberste Ebene")}</option>{groups.filter(group => !blockedParents.has(group.node.id)).map(group => <option key={group.node.id} value={group.node.id}>{nodeName(group.node, draft)}</option>)}</select></label>
          {"ref" in node ? <label>{t("Zeigt")}<select value={node.ref} onChange={event => update(node.id, current => ({ ...current, ref: event.target.value } as RulePresentationNode))}>{refs.map(ref => <option key={ref.id} value={ref.id}>{ref.label}</option>)}</select></label> : null}
        </div>
        <VisibleIfInput key={node.id} value={node.visibleIf ?? ""} onChange={value => update(node.id, current => withOptionalNodeText(current, "visibleIf", value))} />
        {node.kind === "group" ? <div className="button-row"><label className="rf-check"><input type="checkbox" checked={node.collapsible ?? false} onChange={event => update(node.id, current => { const { collapsed: _collapsed, collapsible: _collapsible, ...rest } = current as RulePresentationGroup; return event.target.checked ? { ...rest, collapsible: true } : rest; })} />{t("Einklappbar")}</label>{node.collapsible ? <label className="rf-check"><input type="checkbox" checked={node.collapsed ?? false} onChange={event => update(node.id, current => ({ ...(current as RulePresentationGroup), collapsed: event.target.checked }))} />{t("Standardmäßig eingeklappt")}</label> : null}</div> : null}
        {node.kind === "actions" ? <fieldset><legend>{t("Aktionen in diesem Block")}</legend>{draft.actions.map(action => { const checked = (node.refs ?? []).includes(action.id); return <label className="rf-check" key={action.id}><input type="checkbox" checked={checked} disabled={!checked && unavailableActions.has(action.id) || checked && (node.refs?.length ?? 0) <= 1} onChange={event => update(node.id, current => { const row = current.kind === "actions" ? current : node; const currentRefs = row.refs ?? []; return { ...row, refs: event.target.checked ? [...currentRefs, action.id] : currentRefs.filter(id => id !== action.id) }; })} />{action.name}</label>; })}</fieldset> : null}
      </fieldset></section> : <section className="rf-detail rf-detail-empty"><p className="rf-help">{t("Wähle links einen Eintrag.")}</p></section>}

      {preview ? <aside className="rf-live-panel" aria-label={t("Live-Vorschau des Bogens")}>{preview}</aside> : null}
    </div>
  </section>;
}
