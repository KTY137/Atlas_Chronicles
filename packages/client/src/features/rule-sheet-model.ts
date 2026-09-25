// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { RULE_PRESENTATION_SCHEMA_VERSION, type RulePresentationNode } from "@chronicle/rules";
import { localKey, presentationFromSections, type DraftField, type DraftSection, type RuleDraft } from "./rule-forge-model";

/**
 * Der Bogen hat genau eine Wahrheit: den Oberflächenbaum. Sobald ein Paket einen Baum trägt,
 * zeigen Charakterbogen, Vorlagen und Testtafel nur ihn (`HostRuleFields`, `RuleForgePreview`).
 * Die älteren Bogenabschnitte (`layout.sections`) bleiben gültig, werden aber aus dem Baum
 * abgeleitet, statt daneben ein zweites, wirkungsloses Eigenleben zu führen.
 *
 * Ein Paket, das niemand anfasst, kommt byteidentisch wieder heraus: jede Funktion hier ändert
 * nur, wenn sie wirklich etwas zu ändern hat.
 */
export type SheetRefKind = "field" | "computed" | "vital" | "collection";
const SECTION_LIMIT = 64;
const IDENTIFIER = /^[a-z][a-z0-9_-]*$/;

/** Der Baum, den der Bogen tatsächlich zeigt — bei `presentationAuto` der aus den Abschnitten gerechnete. */
export function sheetTree(draft: RuleDraft): readonly RulePresentationNode[] {
  if (draft.presentation && !draft.presentationAuto) return draft.presentation.root;
  return presentationFromSections(draft).root;
}

/** Gibt es schon einen Baum, der für den Bogen gilt? Pakete im Format 1 bekommen ihn erst beim ersten Ändern. */
export const hasSheetTree = (draft: RuleDraft): boolean => !!draft.presentation;

function walk(nodes: readonly RulePresentationNode[], visit: (node: RulePresentationNode, parent: RulePresentationNode | null) => void, parent: RulePresentationNode | null = null): void {
  for (const node of nodes) { visit(node, parent); if (node.kind === "group") walk(node.children, visit, node); }
}
export function allNodeIds(nodes: readonly RulePresentationNode[]): string[] {
  const ids: string[] = []; walk(nodes, node => ids.push(node.id)); return ids;
}
export function uniqueNodeId(base: string, taken: readonly string[]): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^[^a-z]+/, "").slice(0, 80) || "eintrag";
  if (!taken.includes(clean)) return clean;
  let n = 2; while (taken.includes(`${clean}-${n}`)) n++;
  return `${clean}-${n}`;
}

/** Kategorien des Baums werden Abschnitte; Felder außerhalb jeder Kategorie bleiben ohne Abschnitt (erlaubt). */
export function sectionsFromTree(root: readonly RulePresentationNode[], fields: readonly DraftField[]): DraftSection[] {
  const sections: DraftSection[] = [], taken = new Set<string>(), localOf = new Map<string, string>();
  const byId = new Map(fields.map(field => [field.id, field.localId]));
  const sectionId = (groupId: string): string => {
    const stripped = groupId.startsWith("group-") ? groupId.slice(6) : groupId;
    let id = IDENTIFIER.test(stripped) && !taken.has(stripped) ? stripped : groupId;
    let n = 2; while (taken.has(id)) id = `${groupId}-${n++}`;
    taken.add(id); return id;
  };
  walk(root, (node, parent) => {
    if (node.kind !== "group" || sections.length >= SECTION_LIMIT) return;
    const localId = localKey(); localOf.set(node.id, localId);
    const fieldKeys = node.children.flatMap(child => child.kind === "field" && byId.has(child.ref) ? [byId.get(child.ref)!] : []);
    sections.push({ localId, id: sectionId(node.id), label: node.label, fieldKeys, parentLocalId: parent ? localOf.get(parent.id) ?? null : null });
  });
  return sections;
}

/** Einen geänderten Baum übernehmen: ab jetzt gilt er, und die Abschnitte folgen ihm. */
export function withSheetTree(draft: RuleDraft, root: readonly RulePresentationNode[]): RuleDraft {
  return { ...draft, schemaVersion: 2, collections: draft.collections ?? [], presentation: { schemaVersion: RULE_PRESENTATION_SCHEMA_VERSION, root: [...root] },
    presentationAuto: false, sections: sectionsFromTree(root, draft.fields) };
}

export function isOnSheet(draft: RuleDraft, kind: SheetRefKind, ref: string): boolean {
  let found = false; walk(sheetTree(draft), node => { if (node.kind === kind && "ref" in node && node.ref === ref) found = true; }); return found;
}

function withoutRefs(nodes: readonly RulePresentationNode[], drop: (node: RulePresentationNode) => boolean): RulePresentationNode[] {
  return nodes.filter(node => !drop(node)).map(node => node.kind === "group" ? { ...node, children: withoutRefs(node.children, drop) } : node);
}
/** Wohin ein neuer Eintrag kommt: Balken nach dem letzten Balken der obersten Ebene, sonst ganz nach oben; alles andere ans Ende. */
function insertAt(root: readonly RulePresentationNode[], node: RulePresentationNode): RulePresentationNode[] {
  if (node.kind === "vital") {
    const last = root.map(row => row.kind).lastIndexOf("vital");
    return [...root.slice(0, last + 1), node, ...root.slice(last + 1)];
  }
  if (node.kind === "field") {
    const spare = root.findIndex(row => row.kind === "group" && row.id === "group-weitere-felder");
    if (spare >= 0) return root.map((row, i) => i === spare && row.kind === "group" ? { ...row, children: [...row.children, node] } : row);
  }
  return [...root, node];
}

/** Legt einen Eintrag auf den Bogen oder nimmt ihn herunter. Nichts zu tun heißt: derselbe Entwurf zurück. */
export function placeOnSheet(draft: RuleDraft, kind: SheetRefKind, ref: string, on: boolean): RuleDraft {
  if (isOnSheet(draft, kind, ref) === on) return draft;
  const root = sheetTree(draft);
  if (!on) return withSheetTree(draft, withoutRefs(root, node => node.kind === kind && "ref" in node && node.ref === ref));
  const node = { kind, id: uniqueNodeId(`${kind === "vital" ? "balken" : kind === "computed" ? "wert" : kind === "collection" ? "liste" : "feld"}-${ref}`, allNodeIds(root)), ref } as RulePresentationNode;
  return withSheetTree(draft, insertAt(root, node));
}

/** Attribute entfernen, samt ihrer Plätze in Abschnitten, Baum und Balken. */
export function withoutFields(draft: RuleDraft, ids: ReadonlySet<string>): RuleDraft {
  const fields = draft.fields.filter(field => !ids.has(field.id));
  if (fields.length === draft.fields.length) return draft;
  const kept = new Set(fields.map(field => field.localId));
  return syncSheetWithFields({ ...draft, fields, sections: draft.sections.map(section => ({ ...section, fieldKeys: section.fieldKeys.filter(key => kept.has(key)) })) }, draft.fields);
}

/** Ein Eintrag bekommt eine neue Kennung (oder ein Balken ein anderes Attribut): sein Bogenknoten folgt. */
export function retargetOnSheet(draft: RuleDraft, kind: SheetRefKind, from: string, to: string): RuleDraft {
  if (from === to || !draft.presentation || draft.presentationAuto || !isOnSheet(draft, kind, from)) return draft;
  const map = (nodes: readonly RulePresentationNode[]): RulePresentationNode[] => nodes.map(node => node.kind === "group" ? { ...node, children: map(node.children) }
    : node.kind === kind && "ref" in node && node.ref === from ? { ...node, ref: to } as RulePresentationNode : node);
  return { ...draft, presentation: { ...draft.presentation, root: map(draft.presentation.root) } };
}

/**
 * Nach einer Änderung der Attribute: Ein entferntes Attribut nimmt seine Bogenknoten und seinen
 * Balken mit (sonst wäre das Paket ungültig), ein neues kommt auf den Bogen. Solange der Baum nur
 * aus den Abschnitten gerechnet wird, erledigt das die Ableitung selbst.
 */
export function syncSheetWithFields(draft: RuleDraft, previous: readonly DraftField[]): RuleDraft {
  const kept = new Set(draft.fields.map(field => field.localId));
  const removedIds = new Set(previous.filter(field => !kept.has(field.localId)).map(field => field.id));
  const known = new Set(previous.map(field => field.localId));
  const added = draft.fields.filter(field => !known.has(field.localId));
  let next = draft;
  const vitals = next.vitals?.filter(vital => !removedIds.has(vital.id));
  if (vitals && vitals.length !== next.vitals!.length) next = { ...next, vitals };
  // Eine Liste lebt in ihrem Speicherattribut; ist es weg, geht die Liste mit (wie der Balken).
  const droppedLists = new Set((next.collections ?? []).filter(collection => removedIds.has(collection.storageField)).map(collection => collection.id));
  if (droppedLists.size) next = { ...next, collections: next.collections!.filter(collection => !droppedLists.has(collection.id)) };
  if (!next.presentation || next.presentationAuto) return next;
  if (removedIds.size) {
    let touched = false;
    const root = withoutRefs(next.presentation.root, node => { const drop = ((node.kind === "field" || node.kind === "vital") && removedIds.has(node.ref)) || (node.kind === "collection" && droppedLists.has(node.ref)); touched ||= drop; return drop; });
    if (touched) next = { ...next, presentation: { ...next.presentation, root } };
  }
  for (const field of added) {
    if (isOnSheet(next, "field", field.id)) continue;
    const root = next.presentation!.root;
    next = { ...next, presentation: { ...next.presentation!, root: insertAt(root, { kind: "field", id: uniqueNodeId(`feld-${field.id}`, allNodeIds(root)), ref: field.id }) } };
  }
  return next;
}
