// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@chronicle/ui";
import type { Formula } from "@chronicle/rules";
import { analyzeFormula, resugarFormula, type FormulaSources } from "./formula-sugar";
import { DEFAULT_EXAMPLE_SEED, exampleContextFor, formulaExample, randomSeed, type ExampleFigure } from "./formula-example";
import { FormulaLine } from "./FormulaLine";
import { FormulaBlocks } from "./FormulaBlocks";
import { FormulaGraph } from "./FormulaGraph";
import { compileFormula, formulaDraft, formulaSource, type DraftField, type FormulaDraft } from "./rule-forge-model";
import "./formula-field.css";

export type FormulaView = "line" | "blocks" | "graph";
export const FormulaExampleContext = createContext<ExampleFigure | null>(null);
export interface FormulaFieldProps {
  id?: string; label: string; help?: string; value: string; onChange(next: string): void;
  sources: FormulaSources; allowDice: boolean; allowKnowledge: boolean;
  fields: readonly DraftField[]; inputs?: readonly DraftField[]; actionId?: string; disabled?: boolean;
}
const VIEW_KEY = "atlas.formula-view", VIEWS: readonly [FormulaView, string][] = [["line", "Zeile"], ["blocks", "Bausteine"], ["graph", "Knoten"]];
export function readFormulaView(): FormulaView { try { const value = localStorage.getItem(VIEW_KEY); return value === "blocks" || value === "graph" ? value : "line"; } catch { return "line"; } }
export function writeFormulaView(view: FormulaView): void { try { localStorage.setItem(VIEW_KEY, view); } catch { /* storage may be blocked; the choice just does not persist */ } }

export function FormulaField({ id, label, help, value, onChange, sources, allowDice, allowKnowledge, fields, inputs = [], actionId, disabled = false }: FormulaFieldProps) {
  const generated = useId(), fieldId = id ?? generated, options = useMemo(() => ({ allowDice, allowKnowledge }), [allowDice, allowKnowledge]);
  const [text, setText] = useState(() => resugarFormula(value)), emitted = useRef(value);
  const [view, setView] = useState<FormulaView>("line"), [seed, setSeed] = useState(DEFAULT_EXAMPLE_SEED);
  useEffect(() => { setView(readFormulaView()); }, []);
  // A value arriving from outside (opening a package, undoing) replaces the typed text; our own emissions do not.
  useEffect(() => { if (value !== emitted.current) { emitted.current = value; setText(resugarFormula(value)); } }, [value]);
  const analysis = useMemo(() => analyzeFormula(text, sources, options), [text, sources, options]);
  const lastValid = useRef<Formula | null>(null); if (analysis.ok && analysis.ast) lastValid.current = analysis.ast;
  const figure = useContext(FormulaExampleContext);
  const example = useMemo(() => analysis.ok ? formulaExample(analysis.canonical, exampleContextFor(fields, inputs, figure, seed, actionId), sources) : null, [analysis, fields, inputs, figure, seed, actionId, sources]);
  const emit = (canonical: string) => { emitted.current = canonical; onChange(canonical); };
  const onText = (next: string) => { setText(next); emit(analyzeFormula(next, sources, options).canonical); };
  const fromTree = (ast: Formula) => { const canonical = formulaSource(ast); setText(resugarFormula(canonical)); emit(canonical); };
  const [blocks, setBlocks] = useState<FormulaDraft | null>(null);
  const fromDraft = (draft: FormulaDraft) => {
    try { fromTree(compileFormula(draft)); }
    // An incomplete block (e.g. an empty number): keep the draft visible, publish an invalid
    // expression so the package draft cannot install (H6) rather than silently republishing the
    // last valid expression.
    catch { setBlocks(draft); emit(""); }
  };
  useEffect(() => { if (analysis.ok) setBlocks(null); }, [analysis.ok, text]);
  const hasDice = analysis.ast ? /\dd\d/.test(analysis.canonical) : false;
  const status = example ? (example.ok ? <>{example.text}{hasDice ? <Button variant="quiet" className="ff-reroll" aria-label="Neu würfeln" onClick={() => setSeed(randomSeed())}><Dices size={13} />Neu würfeln</Button> : null}</> : example.message) : "";
  const tree = analysis.ok && analysis.ast ? analysis.ast : lastValid.current;
  const readOnly = !analysis.ok;
  return <div className="ff-field">
    <div className="ff-field-head"><span className="ff-field-title">{label}</span><div className="ff-views" role="group" aria-label="Ansicht der Formel">{VIEWS.map(([key, name]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); writeFormulaView(key); }}>{name}</button>)}</div></div>
    {view === "line" ? <FormulaLine id={fieldId} label="Formel" help={help} text={text} analysis={analysis} sources={sources} options={options} status={status} disabled={disabled} onText={onText} /> : null}
    {view !== "line" ? <>
      <FormulaLine id={fieldId} label="Formel" help={help} text={text} analysis={analysis} sources={sources} options={options} status={status} disabled={disabled} onText={onText} />
      {readOnly && !blocks ? <p className="ff-readonly">Die Zeile enthält einen Fehler; hier siehst du den Stand davor.</p> : null}
      {view === "blocks" ? (blocks ?? tree ? <FormulaBlocks value={blocks ?? formulaDraft(tree!)} onChange={fromDraft} sources={sources} options={options} disabled={disabled || (readOnly && !blocks)} resultLabel={label} /> : null) : null}
      {view === "graph" ? (tree ? <FormulaGraph ast={tree} onChange={fromTree} sources={sources} options={options} disabled={disabled} readOnly={readOnly} /> : null) : null}
    </> : null}
  </div>;
}
