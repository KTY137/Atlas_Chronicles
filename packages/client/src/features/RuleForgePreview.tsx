// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus, TestTubeDiagonal, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { buildRuleRuntime, previewRuleRuntime, evaluateSupportedAction as evaluateAction, RULE_LIMITS, CHRONICLE_EXAMPLE_CHARACTERS, type AnyActionResult as ActionResult, type Experience, type AnyRulePackage as RulePackage, type RuleAction, type RuleActionV2, type Scalar } from "@chronicle/rules";
import { RuleFields } from "./RuleFields";
import { RulePresentationView } from "./RulePresentationView";
import { sichtbareEingaben } from "./faehigkeiten-bogen";
import type { ExampleFigure } from "./formula-example";
import { copyJson, fixtureValues, localKey, type PackageSelfTest } from "./rule-forge-model";
import { hasChronicleExamples, hasChronicleGuidance, RuleComputedFields } from "./RuleComputedFields";

interface SamplePassage { localId: string; passageId: string; labels: string; experience: Experience }
interface Fixture { id: string; name: string; values: Record<string, Scalar>; inputs: Record<string, Record<string, Scalar>>; passages: SamplePassage[] }
const initialFixtures = (): Fixture[] => [
  { id: "fixture-sera", name: "Sera", values: {}, inputs: {}, passages: [{ localId: localKey(), passageId: "beispiel-spur", labels: "spuren", experience: "erfahren" }] },
  { id: "fixture-brannt", name: "Brannt", values: {}, inputs: {}, passages: [] },
];
const MAX_FIXTURES = 6;

/** Pure, reproducible examples. This component never writes a campaign sheet or roll. */
export function RuleForgePreview({ pkg, onFigure, onSaveTest }: { pkg: RulePackage | null; onFigure?: (figure: ExampleFigure | null) => void; onSaveTest?: (test: PackageSelfTest) => void }) {
  const [fixtures, setFixtures] = useState(initialFixtures), [selected, setSelected] = useState("");
  const [seed, setSeed] = useState("00000001000000020000000300000004");
  const action = pkg?.actions.find(a => a.id === selected) ?? pkg?.actions[0];
  const examplesAvailable = useMemo(() => !!pkg && hasChronicleExamples(pkg), [pkg]);
  const update = (id: string, change: Partial<Fixture>) => setFixtures(items => items.map(f => f.id === id ? { ...f, ...change } : f));
  const addFixture = () => setFixtures(items => items.length >= MAX_FIXTURES ? items : [...items, { id: localKey(), name: t("Testfigur {n}", { n: items.length + 1 }), values: {}, inputs: {}, passages: [] }]);
  const removeFixture = (id: string) => setFixtures(items => items.length > 2 ? items.filter(f => f.id !== id) : items);
  const lastFigure = useRef<string | null>(null);
  useEffect(() => {
    const first = fixtures[0];
    const next = pkg && first ? { name: first.name, values: fixtureValues(pkg.fields, first.values), inputs: first.inputs, passages: first.passages.map(p => ({ passageId: p.passageId, labels: p.labels.split(",").map(s => s.trim()).filter(Boolean), experience: p.experience })) } : null;
    const serialized = next ? JSON.stringify(next) : null;
    if (serialized === lastFigure.current) return;
    lastFigure.current = serialized;
    onFigure?.(next);
  }, [fixtures, pkg, onFigure]);
  return <section className="rf-preview" aria-labelledby="rf-preview-title">
    <div className="rf-section-heading"><h2 id="rf-preview-title"><TestTubeDiagonal size={20} />{t("Testtafel")}</h2><span className="rf-node-badge">{t("Nur Beispiele")}</span></div>
    <p>{t("Vergleiche zwei oder mehr Figuren mit unterschiedlichem Wissen. Alle erhalten denselben Würfelstart, damit nur der Wissensunterschied zählt. Die Beispiele verändern keine Charaktere oder Würfe deiner Runde.")}</p>
    {pkg && hasChronicleGuidance(pkg) ? examplesAvailable ? <Button onClick={() => setFixtures(CHRONICLE_EXAMPLE_CHARACTERS.map(example => ({ id: `fixture-${example.id}`, name: example.name, values: fixtureValues(pkg.fields, example.fields), inputs: {}, passages: [] })))}>{t("Beispielfiguren laden")}</Button> : <p className="field-help">{t("Die fertigen Beispielfiguren passen zum unveränderten Beispielkatalog. Für deinen angepassten Katalog verteilst du die Punkte hier selbst.")}</p> : null}
    {!pkg ? <Notice>{t("Die Testtafel wird verfügbar, sobald der Entwurf gültig ist.")}</Notice> : !action ? <Notice>{t("Lege eine Aktion an, um das Regelwerk zu erproben.")}</Notice> : <>
      <div className="rf-form-grid"><label>{t("Aktion")}<select value={action.id} onChange={e => setSelected(e.target.value)}>{pkg.actions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>{t("Würfelstart für reproduzierbare Tests")}<input value={seed} maxLength={32} spellCheck={false} onChange={e => setSeed(e.target.value)} /><small>{t("32 Hexadezimalzeichen, nicht ausschließlich Nullen.")}</small></label></div>
      <p className="rf-disclosure">{action.disclosure}</p>
      <div className="rf-fixtures" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>{fixtures.map(fixture => <FixturePanel key={fixture.id} pkg={pkg} actionId={action.id} fixture={fixture} seed={seed} canRemove={fixtures.length > 2} onChange={change => update(fixture.id, change)} onRemove={() => removeFixture(fixture.id)} onSaveTest={onSaveTest} />)}</div>
      <Button variant="quiet" disabled={fixtures.length >= MAX_FIXTURES} onClick={addFixture}><Plus size={14} />{t("Weitere Testfigur")}</Button>
    </>}
  </section>;
}

function PackageLayoutFields({ pkg, values, onChange }: { pkg: RulePackage; values: Record<string, Scalar>; onChange(values: Record<string, Scalar>): void }) {
  const children = new Map<string | null, RulePackage["layout"]["sections"][number][]>();
  for (const section of pkg.layout.sections) {
    const parent = section.parent ?? null, rows = children.get(parent) ?? [];
    rows.push(section); children.set(parent, rows);
  }
  const render = (section: RulePackage["layout"]["sections"][number], depth: number): ReactNode => {
    const nested = children.get(section.id) ?? [];
    if (!section.fields.length && !nested.length) return null;
    return <fieldset className="rf-sheet-section rule-category" data-depth={Math.min(depth, 8)} key={section.id}><legend>{section.label}</legend>
      {section.fields.length ? <RuleFields fields={Object.fromEntries(section.fields.map(id => [id, pkg.fields[id]!]))} values={values} onChange={onChange} /> : null}
      {nested.length ? <div className="rule-category-children">{nested.map(child => render(child, depth + 1))}</div> : null}
    </fieldset>;
  };
  return <>{(children.get(null) ?? []).map(section => render(section, 0))}</>;
}

function FixturePanel({ pkg, actionId, fixture, seed, canRemove, onChange, onRemove, onSaveTest }: {
  pkg: RulePackage; actionId: string; fixture: Fixture; seed: string; canRemove: boolean; onChange(change: Partial<Fixture>): void; onRemove(): void; onSaveTest?: (test: PackageSelfTest) => void;
}) {
  const action = pkg.actions.find(a => a.id === actionId)!;
  const values = fixtureValues(pkg.fields, fixture.values), inputs = fixtureValues(action.inputs, fixture.inputs[actionId] ?? {});
  const runtime = useMemo(() => buildRuleRuntime(pkg), [pkg]);
  const sheetPreview = useMemo(() => previewRuleRuntime(pkg, fixtureValues(pkg.fields, fixture.values)), [pkg, fixture.values]);
  const [testName, setTestName] = useState("");
  const evaluation = useMemo((): { result: ActionResult; error?: never } | { result?: never; error: string } => {
    try { return { result: evaluateAction(pkg, actionId, { seed, actor: fixtureValues(pkg.fields, fixture.values), input: fixtureValues(pkg.actions.find(a => a.id === actionId)!.inputs, fixture.inputs[actionId] ?? {}), knowledge: { actorId: fixture.id, passages: fixture.passages.map(p => ({ passageId: p.passageId, labels: p.labels.split(",").map(s => s.trim()).filter(Boolean), experience: p.experience })) } }) }; }
    catch (error) { return { error: error instanceof Error ? error.message : t("Das Beispiel konnte nicht berechnet werden.") }; }
  }, [pkg, actionId, seed, fixture]);
  const covered = new Set(pkg.layout.sections.flatMap(s => [...s.fields]));
  const remaining = Object.fromEntries(Object.entries(pkg.fields).filter(([id]) => !covered.has(id)));
  const changePassage = (localId: string, change: Partial<SamplePassage>) => onChange({ passages: fixture.passages.map(p => p.localId === localId ? { ...p, ...change } : p) });
  return <article className="rf-fixture" aria-label={t("Testfigur {name}", { name: fixture.name })}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <h3>{fixture.name}</h3>
      {canRemove ? <Button variant="quiet" aria-label={t("Testfigur {name} entfernen", { name: fixture.name })} onClick={onRemove}><Trash2 size={14} />{t("Entfernen")}</Button> : null}
    </div>
    <label>{t("Name der Testfigur")}<input value={fixture.name} maxLength={120} onChange={e => onChange({ name: e.target.value })} /></label>
    {runtime.presentation ? <RulePresentationView runtime={runtime} preview={sheetPreview} values={values} onChange={next => onChange({ values: next })} /> : <>
      <PackageLayoutFields pkg={pkg} values={values} onChange={next => onChange({ values: next })} />
      {Object.keys(remaining).length ? <fieldset className="rf-sheet-section"><legend>{t("Weitere Felder")}</legend><RuleFields fields={remaining} values={values} onChange={next => onChange({ values: next })} /></fieldset> : null}
      <RuleComputedFields pkg={pkg} fields={values} />
    </>}
    {Object.keys(sichtbareEingaben(pkg, action.inputs)).length ? <fieldset className="rf-sheet-section"><legend>{t("Eingaben: {name}", { name: action.name })}</legend><RuleFields fields={sichtbareEingaben(pkg, action.inputs)} values={inputs} onChange={next => onChange({ inputs: { ...fixture.inputs, [actionId]: next } })} /></fieldset> : null}
    <fieldset className="rf-sheet-section"><legend>{t("Gehaltene Beispielpassagen")}</legend>
      {!fixture.passages.length ? <p className="rf-help">{t("Diese Figur hält keine Passage.")}</p> : null}
      {fixture.passages.map((passage, index) => <div className="rf-sample-passage" key={passage.localId}>
        <label>{t("Passagenkennung")}<input value={passage.passageId} maxLength={256} onChange={e => changePassage(passage.localId, { passageId: e.target.value })} /></label>
        <label>{t("Etiketten, mit Komma getrennt")}<input value={passage.labels} onChange={e => changePassage(passage.localId, { labels: e.target.value })} /></label>
        <label>{t("Erfahrungsgrad")}<select value={passage.experience} onChange={e => changePassage(passage.localId, { experience: e.target.value as Experience })}><option value="erfahren">{t("Selbst erfahren")}</option><option value="gesprochen">{t("Gesprochen")}</option><option value="gehoert">{t("Gehört")}</option></select></label>
        <Button variant="quiet" aria-label={t("Beispielpassage {n} für {name} entfernen", { n: index + 1, name: fixture.name })} onClick={() => onChange({ passages: fixture.passages.filter(p => p.localId !== passage.localId) })}><Trash2 size={14} />{t("Entfernen")}</Button>
      </div>)}
      <Button disabled={fixture.passages.length >= RULE_LIMITS.knowledgePassages} onClick={() => onChange({ passages: [...fixture.passages, { localId: localKey(), passageId: `beispiel-${fixture.passages.length + 1}`, labels: "spuren", experience: "gehoert" }] })}><Plus size={14} />{t("Beispielpassage")}</Button>
    </fieldset>
    {evaluation.error !== undefined ? <Notice error>{`${fixture.name}: ${evaluation.error}`}</Notice> : <>
      <FixtureResult result={evaluation.result} action={action} />
      {onSaveTest ? <div className="rf-save-test"><label>{t("Testname")}<input value={testName} placeholder={`${fixture.name}: ${action.name}`} maxLength={120} onChange={e => setTestName(e.target.value)} /></label><Button onClick={() => onSaveTest(copyJson({ name: testName.trim() || `${fixture.name}: ${action.name}`.slice(0, 120), actionId, context: evaluation.result.context, expectedTotal: evaluation.result.total,
        ...(evaluation.result.schemaVersion === 2 ? { ...(evaluation.result.success !== undefined ? { expectedSuccess: evaluation.result.success } : {}), ...(evaluation.result.outcome ? { expectedOutcomeId: evaluation.result.outcome.id } : {}) } : {}) }))}>{t("Als Pakettest speichern")}</Button></div> : null}
    </>}
  </article>;
}

const OUTCOME_COMPARISON_SYMBOL: Record<string, string> = { eq: "=", lt: "<", lte: "≤", gt: ">", gte: "≥" };
function traceKindLabel(kind: string): string | undefined {
  switch (kind) {
    case "literal": return t("Festwert"); case "unary": return t("Vorzeichen"); case "binary": return t("Verknüpfung"); case "if": return t("Bedingung"); case "dice": return t("Würfel"); case "call": return t("Funktion"); default: return undefined;
  }
}
function FixtureResult({ result, action }: { result: ActionResult; action: RuleAction | RuleActionV2 }) {
  const outcome = result.schemaVersion === 2 ? result.outcome : undefined;
  const bands = "outcome" in action ? action.outcome?.bands : undefined;
  const fallback = "outcome" in action ? action.outcome?.fallback : undefined;
  const operations = result.schemaVersion === 2 ? result.evaluationOperations : result.operations;
  const verdict = outcome ? (outcome.success ? t("{ergebnis} (Erfolg)", { ergebnis: outcome.label }) : t("{ergebnis} (kein Erfolg)", { ergebnis: outcome.label }))
    : action.threshold !== undefined ? (result.success ? t("Schwelle {wert} · erreicht", { wert: action.threshold }) : t("Schwelle {wert} · verfehlt", { wert: action.threshold }))
    : result.success === undefined ? t("Beispielergebnis") : result.success ? t("Schwelle erreicht") : t("Schwelle verfehlt");
  return <div className="rf-fixture-result" aria-live="polite">
    <p className="rf-help">{t("Formel:")} <code>{result.expression}</code></p>
    <div className="rf-result-line"><strong>{result.total}</strong><span>{verdict}</span></div>
    {outcome ? <details open><summary>{t("Ergebnisbereiche dieses Wurfs")}</summary><ol className="rf-trace">
      {outcome.comparisons.map((c, i) => <li key={c.id}><span>{bands?.find(b => b.id === c.id)?.label ?? c.id}</span><strong>{t("Ergebnis")} {OUTCOME_COMPARISON_SYMBOL[c.comparison] ?? c.comparison} {c.threshold}</strong><small>{i === outcome.matchedBand ? t("Ausgewählt") : c.matched ? t("Erfüllt, aber nachrangig") : t("Nicht erfüllt")}</small></li>)}
      {fallback ? <li><span>{fallback.label}</span><strong>{t("Sonst")}</strong><small>{outcome.matchedBand === null ? t("Ausgewählt") : t("Nicht ausgewählt")}</small></li> : null}
    </ol></details> : null}
    {result.dice.map(die => <p key={die.path} className="rf-dice-line">{t("W{seiten}: {wuerfe} · gewertet {gewertet} · Summe {summe}", { seiten: die.sides, wuerfe: die.rolls.map(rolls => `[${rolls.join(" + ")}]`).join(" "), gewertet: die.kept.map(i => i + 1).join(", "), summe: die.total })}{die.capped ? ` · ${t("Zusatzwurfgrenze erreicht")}` : ""}</p>)}
    <details><summary>{t("Rechenweg und Wissensbelege")}</summary><ol className="rf-trace">{result.trace.map((step, i) => <li key={`${step.path}-${i}`}><span>{step.label ?? traceKindLabel(step.kind) ?? step.kind}</span><strong>{String(step.value)}</strong>{step.evidence?.length ? <small>{t("Belege: {liste}", { liste: step.evidence.join(", ") })}</small> : null}</li>)}</ol><p className="rf-help">{t("{anzahl} Rechenschritte · {algorithmus}", { anzahl: operations, algorithmus: result.rngAlgorithm })}</p></details>
  </div>;
}
