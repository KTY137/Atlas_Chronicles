// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@chronicle/ui";
import type { Formula } from "@chronicle/rules";
import { t } from "../i18n";
import { analyzeFormula, resugarFormula, type FormulaAnalysis, type FormulaSources } from "./formula-sugar";
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
const VIEW_KEY = "atlas.formula-view";
const VIEWS: readonly FormulaView[] = ["line", "blocks", "graph"];
/** Der Name einer Ansicht als Funktion mit Literalen: eine Tabelle hätte ihre Texte beim Laden
 * des Moduls eingefroren, und `t` sähe kein Literal. */
function viewName(view: FormulaView): string {
  switch (view) {
    case "line": return t("Zeile");
    case "blocks": return t("Bausteine");
    case "graph": return t("Knoten");
  }
}
export function readFormulaView(): FormulaView { try { const value = localStorage.getItem(VIEW_KEY); return value === "blocks" || value === "graph" ? value : "line"; } catch { return "line"; } }
export function writeFormulaView(view: FormulaView): void { try { localStorage.setItem(VIEW_KEY, view); } catch { /* storage may be blocked; the choice just does not persist */ } }
/** True when `value` arrived from outside (opening a package, undo) rather than being an echo of our own last `onChange` emission — the guard behind "external values replace the typed text; our own emissions do not". */
export function isExternalValue(value: string, lastEmitted: string): boolean { return value !== lastEmitted; }
const incompleteBlockError = () => ({ code: "empty" as const, message: t("Ergänze den leeren Wert in den Bauteilen; bis dahin ist die Formel unvollständig."), start: 0, end: 0 });
/** While a visual block is incomplete (H6), the line must show that — not the stale example or highlighting for a formula that is no longer what will be published. */
export function displayAnalysis(analysis: FormulaAnalysis, incomplete: boolean): FormulaAnalysis { return incomplete ? { ...analysis, ok: false, error: incompleteBlockError() } : analysis; }

export function FormulaField({ id, label, help, value, onChange, sources, allowDice, allowKnowledge, fields, inputs = [], actionId, disabled = false }: FormulaFieldProps) {
  const generated = useId(), fieldId = id ?? generated, options = useMemo(() => ({ allowDice, allowKnowledge }), [allowDice, allowKnowledge]);
  const [text, setText] = useState(() => resugarFormula(value)), emitted = useRef(value);
  const [view, setView] = useState<FormulaView>("line"), [seed, setSeed] = useState(DEFAULT_EXAMPLE_SEED);
  useEffect(() => { setView(readFormulaView()); }, []);
  // A value arriving from outside (opening a package, undoing) replaces the typed text; our own emissions do not.
  useEffect(() => { if (isExternalValue(value, emitted.current)) { emitted.current = value; setText(resugarFormula(value)); } }, [value]);
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
  const status = example ? (example.ok ? <>{example.text}{hasDice ? <Button variant="quiet" className="ff-reroll" aria-label={t("Neu würfeln")} onClick={() => setSeed(randomSeed())}><Dices size={13} />{t("Neu würfeln")}</Button> : null}</> : example.message) : "";
  const tree = analysis.ok && analysis.ast ? analysis.ast : lastValid.current;
  const readOnly = !analysis.ok;
  // While a block is incomplete, the last valid text still analyzes fine on its own — but it no
  // longer matches what emit("") just published, so the line shows that instead of a stale example.
  const lineAnalysis = displayAnalysis(analysis, blocks !== null), lineStatus = blocks !== null ? "" : status;
  return <div className="ff-field">
    <div className="ff-field-head"><span className="ff-field-title">{label}</span><div className="ff-views" role="group" aria-label={t("Ansicht der Formel")}>{VIEWS.map(key => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); writeFormulaView(key); }}>{viewName(key)}</button>)}</div></div>
    {view === "line" ? <FormulaLine id={fieldId} label={t("Formel")} help={help} text={text} analysis={lineAnalysis} sources={sources} options={options} status={lineStatus} disabled={disabled} onText={onText} /> : null}
    {view !== "line" ? <>
      <FormulaLine id={fieldId} label={t("Formel")} help={help} text={text} analysis={lineAnalysis} sources={sources} options={options} status={lineStatus} disabled={disabled} onText={onText} />
      {readOnly && !blocks ? <p className="ff-readonly">{t("Die Zeile enthält einen Fehler; hier siehst du den Stand davor.")}</p> : null}
      {view === "blocks" ? (blocks ?? tree ? <FormulaBlocks value={blocks ?? formulaDraft(tree!)} onChange={fromDraft} sources={sources} options={options} disabled={disabled || (readOnly && !blocks)} resultLabel={label} /> : null) : null}
      {view === "graph" ? (tree ? <FormulaGraph ast={tree} onChange={fromTree} sources={sources} options={options} disabled={disabled} readOnly={readOnly} /> : null) : null}
    </> : null}
  </div>;
}
