// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import { RULE_LIMITS, type Formula, type FormulaType } from "@chronicle/rules";
import { t } from "../i18n";
import { FUNCTION_HELP, memberOptionLabel, memberUnusable, type FormulaOptions, type FormulaSources } from "./formula-sugar";
import { formulaGraph, moveSubtree, nodeAt, removeAt, replaceAt, wrapAt, GAP_X, NODE_HEIGHT, NODE_WIDTH, type GraphNode, type NodePath } from "./formula-graph-model";
import { blockFor, blockKinds, type BlockKind } from "./FormulaBlocks";
import { compileFormula } from "./rule-forge-model";

/** `compact` lässt Legende und Ergebnissatz weg — für viele kleine Netze nebeneinander, etwa in
 * der Regelkarte, wo eine Legende je Formel nur Platz frisst. */
export interface FormulaGraphProps { ast: Formula; onChange(next: Formula): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; readOnly?: boolean; compact?: boolean }
const OPS: Record<string, readonly string[]> = { calc: ["+", "-", "*", "/", "%"], compare: ["==", "!=", ">", ">=", "<", "<="], logic: ["&&", "||"] };
/** Das Zeichen eines Rechenschritts; die drei Wortformen stehen als Literal in einem Zweig,
 * damit `t` sie sieht. Die Symbole bleiben in jeder Sprache gleich. */
const opLabel = (op: string): string => {
  switch (op) {
    case "-": return "−";
    case "*": return "×";
    case "/": return "÷";
    case "%": return t("Rest");
    case "==": return "=";
    case "!=": return "≠";
    case ">=": return "≥";
    case "<=": return "≤";
    case "&&": return t("und");
    case "||": return t("oder");
    default: return op;
  }
};
/** Ein ganzer Satz je Ergebnistyp: „Ergebnis: “ plus angehängtem Typwort ließe sich in einer
 * anderen Sprache nicht umstellen. */
const resultSentence = (type: FormulaType | "unknown"): string => type === "number" ? t("Ergebnis: Zahl")
  : type === "boolean" ? t("Ergebnis: Ja/Nein") : type === "string" ? t("Ergebnis: Text") : t("Ergebnis: noch unklar");

export function FormulaGraph({ ast, onChange, sources, options, disabled = false, readOnly = false, compact = false }: FormulaGraphProps) {
  const graph = formulaGraph(ast, sources), locked = disabled || readOnly;
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<NodePath | null>(null);
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const edit = (next: Formula) => { onChange(next); setSelected(null); };
  const change = (node: GraphNode, mutate: (current: Formula) => Formula) => edit(replaceAt(ast, node.path, mutate(nodeAt(ast, node.path))));
  const drop = (target: GraphNode) => {
    if (!dragging || locked) { setDragging(null); return; }
    try { edit(moveSubtree(ast, dragging, target.path)); } catch { /* moving a part into itself is refused; nothing changes */ }
    setDragging(null);
  };
  // Pointer capture (set on pointerdown, below) routes every subsequent pointer event for this
  // drag back to the port that started it, no matter where the pointer is released — so this one
  // handler both completes a drop onto a node and clears a stale drag released anywhere else
  // (empty canvas, outside the graph entirely).
  const release = (event: { pointerId: number; clientX: number; clientY: number; currentTarget: Element }) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!dragging) return;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const nodeEl = under?.closest<HTMLElement>("[data-node-id]");
    const target = nodeEl ? byId.get(nodeEl.dataset.nodeId!) : undefined;
    if (target) drop(target); else setDragging(null);
  };
  // The hint promises Escape aborts a drag; make that true.
  useEffect(() => {
    if (!dragging) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setDragging(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dragging]);
  const path = (edge: { from: string; to: string; slot: number }) => {
    const from = byId.get(edge.from)!, to = byId.get(edge.to)!;
    const x1 = from.x + NODE_WIDTH, y1 = from.y + NODE_HEIGHT / 2, x2 = to.x, y2 = to.y + 14 + edge.slot * 12;
    return `M ${x1} ${y1} C ${x1 + GAP_X / 2} ${y1}, ${x2 - GAP_X / 2} ${y2}, ${x2} ${y2}`;
  };
  const selectedNode = selected ? byId.get(selected) : undefined;
  return (
    <div className={compact ? "ff-graph ff-graph-compact" : "ff-graph"} role="group" aria-label={t("Formel als Rechenweg")}>
      {compact ? null : <p className="ff-graph-legend">
        <span className="ff-type ff-type-number">{t("Zahl")}</span>
        <span className="ff-type ff-type-boolean">{t("Ja/Nein")}</span>
        <span className="ff-type ff-type-string">{t("Text")}</span>
        <span>{resultSentence(graph.resultType)}</span>
        {readOnly ? <span className="ff-readonly">{t("Die Zeile enthält einen Fehler; hier siehst du den Stand davor.")}</span> : null}
      </p>}
      <div className="ff-graph-canvas" style={{ width: graph.width, height: graph.height }}>
        <svg className="ff-graph-edges" width={graph.width} height={graph.height} aria-hidden="true">
          {graph.edges.map(edge => (
            <path key={`${edge.from}-${edge.to}`} d={path(edge)} className={`ff-edge ff-type-${byId.get(edge.from)!.type}`} />
          ))}
        </svg>
        {graph.nodes.map(node => (
          <div
            key={node.id}
            data-node-id={node.id}
            className={`ff-node ff-node-${node.kind} ff-type-${node.type}${selected === node.id ? " is-selected" : ""}`}
            style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-label={t("{name}, {detail}", { name: node.label, detail: node.detail })}
            title={t("{name}, {detail}", { name: node.label, detail: node.detail })}
            aria-pressed={selected === node.id}
            onClick={() => !locked && setSelected(current => (current === node.id ? null : node.id))}
            onKeyDown={event => {
              if (!locked && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                setSelected(current => (current === node.id ? null : node.id));
              }
            }}
          >
            <strong>{node.label}</strong>
            <small>{node.detail}</small>
            {node.inputs.map((_, slot) => (
              <span key={slot} className="ff-port ff-port-in" style={{ top: 14 + slot * 12 - 4 }} aria-hidden="true" />
            ))}
            {node.path.length ? (
              <span
                className="ff-port ff-port-out"
                aria-hidden="true"
                onPointerDown={event => {
                  if (locked) return;
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(node.path);
                }}
                onPointerUp={release}
                onPointerCancel={release}
              />
            ) : null}
          </div>
        ))}
      </div>
      {selectedNode && !locked ? (
        <NodeEditor
          node={selectedNode}
          current={nodeAt(ast, selectedNode.path)}
          sources={sources}
          options={options}
          onReplace={next => change(selectedNode, () => next)}
          onRemove={() => edit(removeAt(ast, selectedNode.path))}
          onWrap={op => edit(wrapAt(ast, selectedNode.path, op))}
        />
      ) : null}
      {dragging ? <p className="ff-graph-drag">{t("Lass den Teil auf dem Knoten los, der ihn bekommen soll. Escape bricht ab.")}</p> : null}
    </div>
  );
}

function NodeEditor({
  node, current, sources, options, onReplace, onRemove, onWrap,
}: {
  node: GraphNode; current: Formula; sources: FormulaSources; options: FormulaOptions;
  onReplace(next: Formula): void; onRemove(): void; onWrap(op: "+" | "-" | "*" | "/"): void;
}) {
  const ops = OPS[node.kind];
  return (
    <div className="ff-node-editor" role="group" aria-label={t("Bearbeiten: {name}", { name: node.label })}>
      {current.kind === "binary" && ops ? (
        <label>
          {t("Rechenzeichen")}
          <select value={current.op} onChange={event => onReplace({ ...current, op: event.target.value as typeof current.op })}>
            {ops.map(op => <option key={op} value={op}>{opLabel(op)}</option>)}
          </select>
        </label>
      ) : null}
      {current.kind === "field" ? (
        <label>
          {current.source === "actor" ? t("Attribut") : t("Parameter")}
          <select value={current.field} onChange={event => onReplace({ ...current, field: event.target.value })}>
            {sources[current.source].map(m => <option key={m.id} value={m.id} disabled={memberUnusable(m)}>{memberOptionLabel(m)}</option>)}
          </select>
        </label>
      ) : null}
      {current.kind === "literal" && typeof current.value === "number" ? (
        <label>
          {t("Zahl")}
          <input
            type="number"
            step="any"
            value={current.value}
            onChange={event => {
              const value = event.target.valueAsNumber;
              if (Number.isFinite(value)) onReplace({ kind: "literal", value });
            }}
          />
        </label>
      ) : null}
      {current.kind === "literal" && typeof current.value === "boolean" ? (
        <label>
          {t("Wert")}
          <select value={String(current.value)} onChange={event => onReplace({ kind: "literal", value: event.target.value === "true" })}>
            <option value="true">{t("wahr")}</option>
            <option value="false">{t("falsch")}</option>
          </select>
        </label>
      ) : null}
      {current.kind === "literal" && typeof current.value === "string" ? (
        <label>
          {t("Text")}
          <input value={current.value} maxLength={RULE_LIMITS.formulaLength} onChange={event => onReplace({ kind: "literal", value: event.target.value })} />
        </label>
      ) : null}
      {current.kind === "dice" ? (
        <label>
          {t("Würfel")}
          <input value={`${current.count}d${current.sides}`} readOnly />
          <small>{t("Anzahl und Seiten änderst du in der Zeile oder in den Bausteinen.")}</small>
        </label>
      ) : null}
      {current.kind === "call" ? (
        <label>
          {t("Funktion")}
          <select
            value={current.name}
            onChange={event => {
              const name = event.target.value as typeof current.name;
              onReplace({
                kind: "call",
                name,
                args: name === "min" || name === "max"
                  ? [current.args[0] ?? { kind: "literal", value: 0 }, current.args[1] ?? { kind: "literal", value: 0 }]
                  : [current.args[0] ?? { kind: "literal", value: 0 }],
              });
            }}
          >
            {FUNCTION_HELP.filter(f => f.name !== "if" && (options.allowKnowledge || !f.knowledge)).map(f => (
              <option key={f.name} value={f.name}>{f.name} · {f.title}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        {t("Durch etwas anderes ersetzen")}
        <select value="" onChange={event => { if (event.target.value) onReplace(compileFormula(blockFor(event.target.value as BlockKind, sources))); }}>
          <option value="">{t("wählen …")}</option>
          {blockKinds(sources, options).map(k => <option key={k.id} value={k.id} disabled={k.disabled}>{k.label}</option>)}
        </select>
      </label>
      <div className="ff-node-editor-actions">
        {(["+", "-", "*", "/"] as const).map(op => (
          <button key={op} type="button" onClick={() => onWrap(op)}>{t("Rechenschritt {zeichen} anhängen", { zeichen: opLabel(op) })}</button>
        ))}
        <button type="button" onClick={onRemove}>{t("Entfernen")}</button>
      </div>
    </div>
  );
}
