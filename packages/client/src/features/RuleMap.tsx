// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Info, LayoutList, Map as MapIcon, Maximize, Network, Search, TriangleAlert, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@chronicle/ui";
import { parseFormula, type Formula, type RuleVital } from "@chronicle/rules";
import { plural, t } from "../i18n";
import { FormulaField } from "./FormulaField";
import { FormulaGraph } from "./FormulaGraph";
import { formulaGraph } from "./formula-graph-model";
import { sourcesFromDraft, type FormulaSources } from "./formula-sugar";
import { kindLabel, relatedTo, ruleMapGraph, ruleMapLayout, MAP_HEADER, type RuleMapFormula, type RuleMapGraph, type RuleMapKind, type RuleMapNode, type RuleMapSize } from "./rule-map-model";
import { draftExpression, type DraftAction, type DraftField, type RuleDraft } from "./rule-forge-model";
import "./rule-map.css";

export type RuleMapView = "overview" | "map" | "network";
export type RuleMapTab = "fields" | "computed" | "vitals" | "constraints" | "actions";
export interface RuleMapProps {
  draft: RuleDraft; onChange(next: RuleDraft): void; disabled?: boolean;
  /** Sprung in den Reiter, der den gewählten Teil vollständig bearbeitet. */
  onOpen?(tab: RuleMapTab): void;
  /** Startzustand: für Tests und für den Sprung aus einem Befund. */
  initialView?: RuleMapView; initialSelected?: string;
}
const VIEW_KEY = "atlas.rule-map-view";
const VIEWS: readonly RuleMapView[] = ["overview", "map", "network"];
function viewName(view: RuleMapView): string {
  switch (view) {
    case "overview": return t("Übersicht");
    case "map": return t("Karte");
    case "network": return t("Knotennetz");
  }
}
function viewHelp(view: RuleMapView): string {
  switch (view) {
    case "overview": return t("Die Figur als eine Karte: ihre Attribute, was sich daraus ergibt, und was sie tun kann. Klicke einen Eintrag, um ihn zu bearbeiten.");
    case "map": return t("Jeder Teil des Regelwerks als Knoten, jede Verwendung in einer Formel als Verbindung. Klicke einen Knoten: seine Nachbarn leuchten, rechts kannst du ihn bearbeiten. Mit − und + oder Strg + Mausrad zoomst du heraus und hinein.");
    case "network": return t("Wie die Karte, aber jede Formel ist als kleines Knotennetz eingebettet. Zum Ändern wähle den Knoten und bearbeite die Formel rechts. Mit − und + oder Strg + Mausrad zoomst du heraus und hinein.");
  }
}
export function readRuleMapView(): RuleMapView { try { const value = localStorage.getItem(VIEW_KEY); return value === "map" || value === "network" ? value : "overview"; } catch { return "overview"; } }
export function writeRuleMapView(view: RuleMapView): void { try { localStorage.setItem(VIEW_KEY, view); } catch { /* storage may be blocked; the choice just does not persist */ } }
/** Zoom of the map and network views. 1 is the drawn size; smaller values show the whole package at once. */
const ZOOM_KEY = "atlas.rule-map-zoom", ZOOM_MIN = 0.2, ZOOM_MAX = 2, ZOOM_STEP = 1.25;
export const clampRuleMapZoom = (value: number): number => Number.isFinite(value) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100)) : 1;
export function readRuleMapZoom(): number { try { const value = Number(localStorage.getItem(ZOOM_KEY)); return value > 0 ? clampRuleMapZoom(value) : 1; } catch { return 1; } }
export function writeRuleMapZoom(zoom: number): void { try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch { /* storage may be blocked; the zoom just does not persist */ } }
const tabFor = (kind: RuleMapKind): RuleMapTab => kind === "attribute" ? "fields" : kind === "action" ? "actions" : kind === "bar" ? "vitals" : kind === "rule" ? "constraints" : "computed";
function tabButtonLabel(kind: RuleMapKind): string {
  switch (kind) {
    case "attribute": return t("Im Reiter Attribute öffnen");
    case "action": return t("Im Reiter Aktionen öffnen");
    case "bar": return t("Im Reiter Balken öffnen");
    case "rule": return t("Im Reiter Bogenregeln öffnen");
    default: return t("Im Reiter Abgeleitete Werte öffnen");
  }
}
const NO_INPUTS: readonly DraftField[] = [];
const noop = () => { /* eingebettete Netze sind nur Ansicht */ };
const parsed = (expression: string): Formula | null => { try { return parseFormula(expression); } catch { return null; } };
const matches = (node: RuleMapNode, query: string): boolean => { const q = query.trim().toLocaleLowerCase("de"); return !q || `${node.label} ${node.key} ${node.detail}`.toLocaleLowerCase("de").includes(q); };

export function RuleMap({ draft, onChange, disabled = false, onOpen, initialView, initialSelected }: RuleMapProps) {
  const [view, setView] = useState<RuleMapView>(initialView ?? "overview");
  const [selected, setSelected] = useState<string | null>(initialSelected ?? null);
  const [query, setQuery] = useState("");
  useEffect(() => { if (!initialView) setView(readRuleMapView()); }, [initialView]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  const graph = useMemo(() => ruleMapGraph(draft), [draft]);
  const byId = useMemo(() => new Map(graph.nodes.map(n => [n.id, n])), [graph]);
  const baseSources = useMemo(() => sourcesFromDraft(draft.fields), [draft.fields]);
  const actionOf = useCallback((node: RuleMapNode): DraftAction | undefined => node.kind === "action" ? draft.actions.find(a => a.localId === node.localId) : undefined, [draft.actions]);
  // Stable per render input: the embedded nets of the network mode are memoised on this function,
  // so a fresh closure per keystroke would relayout every formula in the package.
  const sourcesOf = useCallback((node: RuleMapNode): FormulaSources => { const action = actionOf(node); return action && action.inputs.length ? sourcesFromDraft(draft.fields, action.inputs) : baseSources; }, [actionOf, draft.fields, baseSources]);
  const related = useMemo(() => selected ? new Set([selected, ...relatedTo(graph, selected)]) : null, [graph, selected]);
  const node = selected ? byId.get(selected) : undefined;
  const choose = (id: string) => setSelected(current => (current === id ? null : id));
  const errors = graph.issues.filter(i => i.status === "error").length;
  return <div className="rule-map">
    <div className="rm-head">
      <div className="rm-views" role="group" aria-label={t("Ansicht der Regelkarte")}>
        {VIEWS.map(key => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); writeRuleMapView(key); }}>
          {key === "overview" ? <LayoutList size={14} aria-hidden="true" /> : key === "map" ? <MapIcon size={14} aria-hidden="true" /> : <Network size={14} aria-hidden="true" />}{viewName(key)}
        </button>)}
      </div>
      {graph.nodes.length >= 10 ? <label className="rm-search"><Search size={14} aria-hidden="true" /><input aria-label={t("Knoten suchen")} value={query} placeholder={t("Bezeichnung oder Kennung")} onChange={event => setQuery(event.target.value)} /></label> : null}
    </div>
    <p className="rf-help">{viewHelp(view)}</p>
    {graph.issues.length ? <details className="rm-issues" open={errors > 0}>
      <summary>{errors ? <TriangleAlert size={14} aria-hidden="true" /> : <Info size={14} aria-hidden="true" />}{plural(graph.issues.length, "{n} Hinweis", "{n} Hinweise")}</summary>
      <ul>{graph.issues.map((issue, i) => <li key={i} className={`rm-issue rm-issue-${issue.status}`}><button type="button" onClick={() => setSelected(issue.nodeId)}><strong>{byId.get(issue.nodeId)?.label ?? issue.nodeId}</strong><span>{issue.message}</span></button></li>)}</ul>
    </details> : null}
    <div className={node ? "rm-body rm-body-open" : "rm-body"}>
      {view === "overview"
        ? <Overview graph={graph} selected={selected} query={query} onSelect={choose} />
        : <Canvas graph={graph} view={view} selected={selected} related={related} query={query} sourcesOf={sourcesOf} onSelect={choose} />}
      {node ? <NodeEditor key={node.id} node={node} graph={graph} draft={draft} disabled={disabled} sources={sourcesOf(node)} action={actionOf(node)} onChange={onChange} onSelect={setSelected} onClose={() => setSelected(null)} onOpen={onOpen} /> : null}
    </div>
  </div>;
}

function Overview({ graph, selected, query, onSelect }: { graph: RuleMapGraph; selected: string | null; query: string; onSelect(id: string): void }) {
  const shown = graph.nodes.filter(n => matches(n, query));
  const of = (kind: RuleMapKind) => shown.filter(n => n.kind === kind);
  const row = (n: RuleMapNode) => <li key={n.id} className={`rm-row rm-status-${n.status}`}><button type="button" data-node-id={n.id} aria-current={selected === n.id ? "true" : undefined} title={n.message} onClick={() => onSelect(n.id)}>
    <strong>{n.label}</strong><span>{n.detail}</span>
  </button></li>;
  const groups = [...new Set(of("attribute").map(n => n.group))];
  return <article className="rm-class" aria-label={t("Die Figur als Karte")}>
    <header><h4>{t("Figur")}</h4><span className="rf-help">{t("{anzahl} Teile", { anzahl: graph.nodes.length })}</span></header>
    <section><h5>{t("Attribute")}</h5>
      {groups.map(group => <div key={group ?? ""} className="rm-group"><h6>{group}</h6><ul>{of("attribute").filter(n => n.group === group).map(row)}</ul></div>)}
      {!of("attribute").length ? <p className="rf-help">{t("Noch keine Attribute.")}</p> : null}
    </section>
    <section><h5>{t("Abgeleitet")}</h5><ul>{of("computed").map(row)}</ul>{!of("computed").length ? <p className="rf-help">{t("Noch keine abgeleiteten Werte.")}</p> : null}</section>
    <section><h5>{t("Regeln")}</h5><ul>{of("rule").map(row)}</ul>{!of("rule").length ? <p className="rf-help">{t("Noch keine Regeln.")}</p> : null}</section>
    <section><h5>{t("Balken")}</h5><ul>{of("bar").map(row)}</ul>{!of("bar").length ? <p className="rf-help">{t("Noch keine Balken.")}</p> : null}</section>
    <section className="rm-methods"><h5>{t("Aktionen")}</h5><ul>{of("action").map(row)}</ul>{!of("action").length ? <p className="rf-help">{t("Noch keine Aktionen.")}</p> : null}</section>
  </article>;
}

const MAP_SIZE = (node: RuleMapNode): RuleMapSize => node.kind === "attribute" ? { width: 190, height: 48 } : { width: 250, height: 52 };
const EMBED_PAD = 24, EMBED_LABEL = 20, EMBED_GAP = 8, NODE_HEAD = 48, FRAME_PAD = 12;
function Canvas({ graph, view, selected, related, query, sourcesOf, onSelect }: { graph: RuleMapGraph; view: "map" | "network"; selected: string | null; related: Set<string> | null; query: string; sourcesOf(node: RuleMapNode): FormulaSources; onSelect(id: string): void }) {
  const embedded = useMemo(() => {
    if (view !== "network") return new Map<string, { formula: RuleMapFormula; ast: Formula | null; width: number; height: number }[]>();
    return new Map(graph.nodes.filter(n => n.formulas.length).map(n => {
      const sources = sourcesOf(n);
      return [n.id, n.formulas.map(formula => { const ast = parsed(formula.expression); const g = ast ? formulaGraph(ast, sources) : null; return { formula, ast, width: g ? g.width + EMBED_PAD : 200, height: g ? g.height + EMBED_PAD : 24 }; })];
    }));
  }, [graph, view, sourcesOf]);
  const layout = useMemo(() => ruleMapLayout(graph, (node: RuleMapNode): RuleMapSize => {
    const parts = embedded.get(node.id);
    if (!parts?.length) return MAP_SIZE(node);
    return { width: Math.max(250, ...parts.map(p => p.width + 2 * EMBED_GAP)), height: NODE_HEAD + parts.reduce((sum, p) => sum + EMBED_LABEL + p.height + EMBED_GAP, 0) };
  }), [graph, embedded]);
  const placed = new Map(layout.nodes.map(n => [n.id, n]));
  const path = (edge: { from: string; to: string }) => {
    const from = placed.get(edge.from)!, to = placed.get(edge.to)!;
    const x1 = from.x + from.width, y1 = from.y + Math.min(24, from.height / 2), x2 = to.x, y2 = to.y + 24, dx = Math.max(36, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };
  const dim = (id: string) => (related && !related.has(id)) || !matches(graph.nodes.find(n => n.id === id)!, query);
  const frame = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(readRuleMapZoom);
  const applyZoom = useCallback((next: number) => { const value = clampRuleMapZoom(next); setZoom(value); writeRuleMapZoom(value); return value; }, []);
  const fit = () => { const node = frame.current; if (!node) return; applyZoom((node.clientWidth - 2 * FRAME_PAD) / Math.max(1, layout.width)); };
  // Ctrl + wheel zooms around the pointer, plain wheel keeps scrolling. A native listener is
  // required because React registers wheel handlers passively and could not cancel the browser zoom.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect(), px = event.clientX - rect.left, py = event.clientY - rect.top;
      const before = zoom, after = applyZoom(event.deltaY < 0 ? before * 1.1 : before / 1.1);
      if (after === before) return;
      const cx = (node.scrollLeft + px - FRAME_PAD) / before, cy = (node.scrollTop + py - FRAME_PAD) / before;
      requestAnimationFrame(() => { node.scrollLeft = cx * after - px + FRAME_PAD; node.scrollTop = cy * after - py + FRAME_PAD; });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoom, applyZoom]);
  return <>
    <div className="rm-canvas-tools" role="group" aria-label={t("Vergrößerung der Karte")}>
      <button type="button" aria-label={t("Verkleinern")} title={t("Verkleinern")} disabled={zoom <= ZOOM_MIN} onClick={() => applyZoom(zoom / ZOOM_STEP)}><ZoomOut size={14} aria-hidden="true" /></button>
      <button type="button" className="rm-zoom-value" aria-label={t("Auf volle Größe zurücksetzen")} title={t("Auf volle Größe zurücksetzen")} onClick={() => applyZoom(1)}>{Math.round(zoom * 100)} %</button>
      <button type="button" aria-label={t("Vergrößern")} title={t("Vergrößern")} disabled={zoom >= ZOOM_MAX} onClick={() => applyZoom(zoom * ZOOM_STEP)}><ZoomIn size={14} aria-hidden="true" /></button>
      <button type="button" aria-label={t("Ganze Karte einpassen")} title={t("Ganze Karte einpassen")} onClick={fit}><Maximize size={14} aria-hidden="true" />{t("Einpassen")}</button>
    </div>
    <div className="rm-canvas-frame" ref={frame} role="group" aria-label={view === "map" ? t("Regelkarte") : t("Regelkarte mit Knotennetzen")} data-zoom={zoom}>
    <div className="rm-canvas-scaled" style={{ width: layout.width * zoom, height: layout.height * zoom }}>
    <div className="rm-canvas" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
      <svg className="rm-edges" width={layout.width} height={layout.height} aria-hidden="true">
        {graph.edges.map(edge => <path key={`${edge.from}-${edge.to}`} d={path(edge)} className={`rm-edge${related ? (related.has(edge.from) && related.has(edge.to) && (edge.from === selected || edge.to === selected) ? " is-related" : " is-dim") : ""}`} />)}
      </svg>
      {layout.columns.map(column => <div key={column.label} className="rm-column-head" style={{ left: column.x, width: column.width, height: MAP_HEADER }}>{column.label}</div>)}
      {layout.groups.map((group, i) => <div key={i} className="rm-group-head" style={{ left: group.x, top: group.y, width: group.width }}>{group.label}</div>)}
      {layout.nodes.map(place => {
        const n = graph.nodes.find(g => g.id === place.id)!, parts = embedded.get(n.id);
        return <div key={n.id} data-node-id={n.id} className={`rm-node rm-node-${n.kind} rm-status-${n.status}${selected === n.id ? " is-selected" : ""}${dim(n.id) ? " is-dim" : ""}`} style={{ left: place.x, top: place.y, width: place.width, height: place.height }}>
          <button type="button" className="rm-node-head" aria-pressed={selected === n.id} aria-label={t("{name}, {art}", { name: n.label, art: kindLabel(n.kind) })} title={n.message ?? n.detail} onClick={() => onSelect(n.id)}>
            <strong>{n.label}</strong><small>{parts ? kindLabel(n.kind) : n.detail}</small>
          </button>
          {parts ? parts.map((part, i) => <div key={i} className="rm-embedded" style={{ height: EMBED_LABEL + part.height }}>
            <span className="rm-embedded-label">{part.formula.label}</span>
            {part.ast ? <FormulaGraph ast={part.ast} onChange={noop} sources={sourcesOf(n)} options={{ allowDice: true, allowKnowledge: true }} readOnly compact /> : <span className="rm-embedded-broken">{t("Formel nicht lesbar")}</span>}
          </div>) : null}
        </div>;
      })}
    </div>
    </div>
  </div></>;
}

function NodeEditor({ node, graph, draft, disabled, sources, action, onChange, onSelect, onClose, onOpen }: {
  node: RuleMapNode; graph: RuleMapGraph; draft: RuleDraft; disabled: boolean; sources: FormulaSources; action?: DraftAction;
  onChange(next: RuleDraft): void; onSelect(id: string): void; onClose(): void; onOpen?(tab: RuleMapTab): void;
}) {
  const inputs = action?.inputs ?? NO_INPUTS;
  const neighbours = relatedTo(graph, node.id).map(id => graph.nodes.find(n => n.id === id)).filter((n): n is RuleMapNode => n !== undefined);
  const field = node.kind === "attribute" ? draft.fields.find(f => f.localId === node.localId) : undefined;
  const computedIndex = node.kind === "computed" ? (draft.computed ?? []).findIndex(v => v.id === node.key) : -1;
  const ruleIndex = node.kind === "rule" ? (draft.constraints ?? []).findIndex(v => v.id === node.key) : -1;
  const barIndex = node.kind === "bar" ? (draft.vitals ?? []).findIndex(v => v.id === node.key) : -1;
  const computed = computedIndex >= 0 ? draft.computed![computedIndex] : undefined, rule = ruleIndex >= 0 ? draft.constraints![ruleIndex] : undefined, bar = barIndex >= 0 ? draft.vitals![barIndex] : undefined;
  const patchComputed = (patch: Partial<NonNullable<RuleDraft["computed"]>[number]>) => onChange({ ...draft, computed: draft.computed!.map((v, i) => i === computedIndex ? { ...v, ...patch } : v) });
  const patchRule = (patch: Partial<NonNullable<RuleDraft["constraints"]>[number]>) => onChange({ ...draft, constraints: draft.constraints!.map((v, i) => i === ruleIndex ? { ...v, ...patch } : v) });
  const patchBar = (patch: Partial<RuleVital>) => onChange({ ...draft, vitals: draft.vitals!.map((v, i) => i === barIndex ? { ...v, ...patch } : v) });
  const patchAction = (patch: Partial<DraftAction>) => { if (action) onChange({ ...draft, actions: draft.actions.map(a => a.localId === action.localId ? { ...a, ...patch } : a) }); };
  const patchField = (patch: Partial<DraftField>) => { if (field) onChange({ ...draft, fields: draft.fields.map(f => f.localId === field.localId ? { ...f, ...patch } : f) }); };
  let result: string | null = null; if (action) { try { result = draftExpression(action); } catch { result = null; } }
  return <aside className="rm-editor" role="region" aria-label={t("Bearbeiten: {name}", { name: node.label })}>
    <div className="rf-section-heading"><div><h4>{node.label}</h4><span className="rf-help">{t("{art} · {kennung}", { art: kindLabel(node.kind), kennung: node.key })}</span></div><Button variant="quiet" onClick={onClose}>{t("Schließen")}</Button></div>
    {node.message ? <p className={`rm-editor-message rm-issue-${node.status}`}>{node.message}</p> : null}
    <fieldset className="rf-editor-fields" disabled={disabled}>
      {field ? <>
        <label>{t("Beschriftung")}<input value={field.label} maxLength={120} onChange={event => patchField({ label: event.target.value })} /><small>{t("{art}. In Formeln als @{kennung}.", { art: node.detail, kennung: field.id })}</small></label>
      </> : null}
      {computed ? <>
        <label>{t("Beschriftung")}<input value={computed.label} maxLength={120} onChange={event => patchComputed({ label: event.target.value })} /></label>
        <FormulaField label={t("Berechnung")} help={t("Ergibt sich aus Attributen, ohne Wurf.")} value={computed.expression} onChange={expression => patchComputed({ expression })} sources={sources} fields={draft.fields} allowDice={false} allowKnowledge={false} />
      </> : null}
      {rule ? <>
        <label>{t("Meldung, wenn die Regel verletzt ist")}<input value={rule.message} maxLength={240} onChange={event => patchRule({ message: event.target.value })} /></label>
        <FormulaField label={t("Bedingung")} help={t("Muss zutreffen, damit der Bogen gültig ist, zum Beispiel @punkte <= 400.")} value={rule.expression} onChange={expression => patchRule({ expression })} sources={sources} fields={draft.fields} allowDice={false} allowKnowledge={false} />
      </> : null}
      {bar ? <>
        <label>{t("Beschriftung")}<input value={bar.label} maxLength={120} onChange={event => patchBar({ label: event.target.value })} /></label>
        <FormulaField label={t("Höchststand")} help={t("Der höchste Stand, den der Balken zeigt, zum Beispiel @konstitution * 5.")} value={bar.max} onChange={max => patchBar({ max })} sources={sources} fields={draft.fields} allowDice={false} allowKnowledge={false} />
        <label>{t("Wenn der Wert 0 erreicht")}<select value={bar.depletion} onChange={event => patchBar({ depletion: event.target.value as RuleVital["depletion"] })}><option value="none">{t("Nichts Besonderes")}</option><option value="defeat">{t("Niederlage zur Bestätigung")}</option></select></label>
      </> : null}
      {action ? <>
        <label>{t("Name")}<input value={action.name} maxLength={120} onChange={event => patchAction({ name: event.target.value })} /></label>
        {action.inputs.length ? <p className="rf-help">{t("Parameter: {liste}", { liste: action.inputs.map(i => `?${i.id}`).join(", ") })}</p> : null}
        {result !== null
          ? <FormulaField label={t("Ergebnis")} help={t("Der Wurf mit allen Zuschlägen, zum Beispiel 1d20 + @geschick + ?bonus.")} value={result} onChange={expression => patchAction({ expression })} sources={sources} fields={draft.fields} inputs={inputs} actionId={action.id} allowDice allowKnowledge />
          : <p className="rm-editor-message rm-issue-error">{t("Die Formel dieser Aktion ist unvollständig. Öffne den Reiter Aktionen, um sie zu vervollständigen.")}</p>}
        {(action.preconditions ?? []).map((rule, i) => <FormulaField key={`pre-${i}`} label={t("Voraussetzung: {meldung}", { meldung: rule.message })} value={rule.expression} onChange={expression => patchAction({ preconditions: action.preconditions!.map((p, n) => n === i ? { ...p, expression } : p) })} sources={sources} fields={draft.fields} inputs={inputs} actionId={action.id} allowDice={false} allowKnowledge={false} />)}
        {(action.outcome?.bands ?? []).map((band, i) => <FormulaField key={`band-${i}`} label={t("Ergebnisbereich: {name}", { name: band.label })} value={band.expression} onChange={expression => patchAction({ outcome: { ...action.outcome!, bands: action.outcome!.bands.map((b, n) => n === i ? { ...b, expression } : b) } })} sources={sources} fields={draft.fields} inputs={inputs} actionId={action.id} allowDice={false} allowKnowledge={false} />)}
      </> : null}
    </fieldset>
    {neighbours.length ? <div className="rm-related"><h5>{t("Hängt zusammen mit")}</h5><ul>{neighbours.map(n => <li key={n.id}><button type="button" onClick={() => onSelect(n.id)}><strong>{n.label}</strong><small>{kindLabel(n.kind)}</small></button></li>)}</ul></div>
      : <p className="rf-help">{t("Hängt mit nichts zusammen.")}</p>}
    {onOpen ? <Button onClick={() => onOpen(tabFor(node.kind))}><ExternalLink size={14} />{tabButtonLabel(node.kind)}</Button> : null}
  </aside>;
}
