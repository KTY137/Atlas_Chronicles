import { useMemo, useState } from "react";
import { Plus, TestTubeDiagonal, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { evaluateSupportedAction as evaluateAction, RULE_LIMITS, HTBAH_EXAMPLE_CHARACTERS, type AnyActionResult as ActionResult, type Experience, type AnyRulePackage as RulePackage, type RuleAction, type RuleActionV2, type Scalar } from "@chronicle/rules";
import { RuleFields } from "./RuleFields";
import { copyJson, fixtureValues, localKey, type PackageSelfTest } from "./rule-forge-model";
import { hasHtbahExamples, hasHtbahGuidance, RuleComputedFields } from "./RuleComputedFields";

interface SamplePassage { localId: string; passageId: string; labels: string; experience: Experience }
interface Fixture { id: string; name: string; values: Record<string, Scalar>; inputs: Record<string, Record<string, Scalar>>; passages: SamplePassage[] }
const initialFixtures = (): Fixture[] => [
  { id: "fixture-sera", name: "Sera", values: {}, inputs: {}, passages: [{ localId: localKey(), passageId: "beispiel-spur", labels: "spuren", experience: "erfahren" }] },
  { id: "fixture-brannt", name: "Brannt", values: {}, inputs: {}, passages: [] },
];
/** Upper bound for author-added test figures; keeps the comparison readable beyond "two or more". */
const MAX_FIXTURES = 6;

/** Pure, reproducible examples. This component never writes a campaign sheet or roll. */
export function RuleForgePreview({ pkg, onSaveTest }: { pkg: RulePackage | null; onSaveTest?: (test: PackageSelfTest) => void }) {
  const [fixtures, setFixtures] = useState(initialFixtures), [selected, setSelected] = useState("");
  const [seed, setSeed] = useState("00000001000000020000000300000004");
  const action = pkg?.actions.find(a => a.id === selected) ?? pkg?.actions[0];
  const examplesAvailable = useMemo(() => !!pkg && hasHtbahExamples(pkg), [pkg]);
  const update = (id: string, change: Partial<Fixture>) => setFixtures(items => items.map(f => f.id === id ? { ...f, ...change } : f));
  const addFixture = () => setFixtures(items => items.length >= MAX_FIXTURES ? items : [...items, { id: localKey(), name: `Testfigur ${items.length + 1}`, values: {}, inputs: {}, passages: [] }]);
  const removeFixture = (id: string) => setFixtures(items => items.length > 2 ? items.filter(f => f.id !== id) : items);
  return <section className="rf-preview" aria-labelledby="rf-preview-title">
    <div className="rf-section-heading"><h2 id="rf-preview-title"><TestTubeDiagonal size={20} />Testtafel</h2><span className="rf-node-badge">Nur Beispiele</span></div>
    <p>Vergleiche zwei oder mehr Figuren mit unterschiedlichem Wissen. Alle erhalten denselben Würfelstart, damit nur der Wissensunterschied zählt. Die Beispiele verändern keine Charaktere oder Würfe deiner Runde.</p>
    {pkg && hasHtbahGuidance(pkg) ? examplesAvailable ? <Button onClick={() => setFixtures(HTBAH_EXAMPLE_CHARACTERS.map(example => ({ id: `fixture-${example.id}`, name: example.name, values: fixtureValues(pkg.fields, example.fields), inputs: {}, passages: [] })))}>HTBAH-Beispielfiguren laden</Button> : <p className="field-help">Die fertigen Beispielfiguren passen zum unveränderten Beispielkatalog. Für deinen angepassten Katalog verteilst du die Punkte hier selbst.</p> : null}
    {!pkg ? <Notice>Die Testtafel wird verfügbar, sobald der Entwurf gültig ist.</Notice> : !action ? <Notice>Lege eine Aktion an, um das Regelwerk zu erproben.</Notice> : <>
      <div className="rf-form-grid"><label>Aktion<select value={action.id} onChange={e => setSelected(e.target.value)}>{pkg.actions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Würfelstart für reproduzierbare Tests<input value={seed} maxLength={32} spellCheck={false} onChange={e => setSeed(e.target.value)} /><small>32 Hexadezimalzeichen, nicht ausschließlich Nullen.</small></label></div>
      <p className="rf-disclosure">{action.disclosure}</p>
      <div className="rf-fixtures" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>{fixtures.map(fixture => <FixturePanel key={fixture.id} pkg={pkg} actionId={action.id} fixture={fixture} seed={seed} canRemove={fixtures.length > 2} onChange={change => update(fixture.id, change)} onRemove={() => removeFixture(fixture.id)} onSaveTest={onSaveTest} />)}</div>
      <Button variant="quiet" disabled={fixtures.length >= MAX_FIXTURES} onClick={addFixture}><Plus size={14} />Weitere Testfigur</Button>
    </>}
  </section>;
}

function FixturePanel({ pkg, actionId, fixture, seed, canRemove, onChange, onRemove, onSaveTest }: {
  pkg: RulePackage; actionId: string; fixture: Fixture; seed: string; canRemove: boolean; onChange(change: Partial<Fixture>): void; onRemove(): void; onSaveTest?: (test: PackageSelfTest) => void;
}) {
  const action = pkg.actions.find(a => a.id === actionId)!;
  const values = fixtureValues(pkg.fields, fixture.values), inputs = fixtureValues(action.inputs, fixture.inputs[actionId] ?? {});
  const [testName, setTestName] = useState("");
  const evaluation = useMemo((): { result: ActionResult; error?: never } | { result?: never; error: string } => {
    try { return { result: evaluateAction(pkg, actionId, { seed, actor: fixtureValues(pkg.fields, fixture.values), input: fixtureValues(pkg.actions.find(a => a.id === actionId)!.inputs, fixture.inputs[actionId] ?? {}), knowledge: { actorId: fixture.id, passages: fixture.passages.map(p => ({ passageId: p.passageId, labels: p.labels.split(",").map(s => s.trim()).filter(Boolean), experience: p.experience })) } }) }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Das Beispiel konnte nicht berechnet werden." }; }
  }, [pkg, actionId, seed, fixture]);
  const covered = new Set(pkg.layout.sections.flatMap(s => [...s.fields]));
  const remaining = Object.fromEntries(Object.entries(pkg.fields).filter(([id]) => !covered.has(id)));
  const changePassage = (localId: string, change: Partial<SamplePassage>) => onChange({ passages: fixture.passages.map(p => p.localId === localId ? { ...p, ...change } : p) });
  return <article className="rf-fixture" aria-label={`Testfigur ${fixture.name}`}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <h3>{fixture.name}</h3>
      {canRemove ? <Button variant="quiet" aria-label={`Testfigur ${fixture.name} entfernen`} onClick={onRemove}><Trash2 size={14} />Entfernen</Button> : null}
    </div>
    <label>Name der Testfigur<input value={fixture.name} maxLength={120} onChange={e => onChange({ name: e.target.value })} /></label>
    {pkg.layout.sections.map(section => <fieldset className="rf-sheet-section" key={section.id}><legend>{section.label}</legend><RuleFields fields={Object.fromEntries(section.fields.map(id => [id, pkg.fields[id]!]))} values={values} onChange={next => onChange({ values: next })} /></fieldset>)}
    {Object.keys(remaining).length ? <fieldset className="rf-sheet-section"><legend>Weitere Felder</legend><RuleFields fields={remaining} values={values} onChange={next => onChange({ values: next })} /></fieldset> : null}
    <RuleComputedFields pkg={pkg} fields={values} />
    {Object.keys(action.inputs).length ? <fieldset className="rf-sheet-section"><legend>Eingaben: {action.name}</legend><RuleFields fields={action.inputs} values={inputs} onChange={next => onChange({ inputs: { ...fixture.inputs, [actionId]: next } })} /></fieldset> : null}
    <fieldset className="rf-sheet-section"><legend>Gehaltene Beispielpassagen</legend>
      {!fixture.passages.length ? <p className="rf-help">Diese Figur hält keine Passage.</p> : null}
      {fixture.passages.map((passage, index) => <div className="rf-sample-passage" key={passage.localId}>
        <label>Passagenkennung<input value={passage.passageId} maxLength={256} onChange={e => changePassage(passage.localId, { passageId: e.target.value })} /></label>
        <label>Etiketten, mit Komma getrennt<input value={passage.labels} onChange={e => changePassage(passage.localId, { labels: e.target.value })} /></label>
        <label>Erfahrungsgrad<select value={passage.experience} onChange={e => changePassage(passage.localId, { experience: e.target.value as Experience })}><option value="erfahren">Selbst erfahren</option><option value="gesprochen">Gesprochen</option><option value="gehoert">Gehört</option></select></label>
        <Button variant="quiet" aria-label={`Beispielpassage ${index + 1} für ${fixture.name} entfernen`} onClick={() => onChange({ passages: fixture.passages.filter(p => p.localId !== passage.localId) })}><Trash2 size={14} />Entfernen</Button>
      </div>)}
      <Button disabled={fixture.passages.length >= RULE_LIMITS.knowledgePassages} onClick={() => onChange({ passages: [...fixture.passages, { localId: localKey(), passageId: `beispiel-${fixture.passages.length + 1}`, labels: "spuren", experience: "gehoert" }] })}><Plus size={14} />Beispielpassage</Button>
    </fieldset>
    {evaluation.error !== undefined ? <Notice error>{`${fixture.name}: ${evaluation.error}`}</Notice> : <>
      <FixtureResult result={evaluation.result} action={action} />
      {onSaveTest ? <div className="rf-save-test"><label>Testname<input value={testName} placeholder={`${fixture.name}: ${action.name}`} maxLength={120} onChange={e => setTestName(e.target.value)} /></label><Button onClick={() => onSaveTest(copyJson({ name: testName.trim() || `${fixture.name}: ${action.name}`.slice(0, 120), actionId, context: evaluation.result.context, expectedTotal: evaluation.result.total,
        ...(evaluation.result.schemaVersion === 2 ? { ...(evaluation.result.success !== undefined ? { expectedSuccess: evaluation.result.success } : {}), ...(evaluation.result.outcome ? { expectedOutcomeId: evaluation.result.outcome.id } : {}) } : {}) }))}>Als Pakettest speichern</Button></div> : null}
    </>}
  </article>;
}

const OUTCOME_COMPARISON_SYMBOL: Record<string, string> = { eq: "=", lt: "<", lte: "≤", gt: ">", gte: "≥" };
const TRACE_KIND_LABEL: Record<string, string> = { literal: "Festwert", unary: "Vorzeichen", binary: "Verknüpfung", if: "Bedingung", dice: "Würfel", call: "Funktion" };

function FixtureResult({ result, action }: { result: ActionResult; action: RuleAction | RuleActionV2 }) {
  const outcome = result.schemaVersion === 2 ? result.outcome : undefined;
  const bands = "outcome" in action ? action.outcome?.bands : undefined;
  const fallback = "outcome" in action ? action.outcome?.fallback : undefined;
  const operations = result.schemaVersion === 2 ? result.evaluationOperations : result.operations;
  const verdict = outcome ? `${outcome.label} (${outcome.success ? "Erfolg" : "kein Erfolg"})`
    : action.threshold !== undefined ? `Schwelle ${action.threshold} · ${result.success ? "erreicht" : "verfehlt"}`
    : result.success === undefined ? "Beispielergebnis" : result.success ? "Schwelle erreicht" : "Schwelle verfehlt";
  return <div className="rf-fixture-result" aria-live="polite">
    <p className="rf-help">Formel: <code>{result.expression}</code></p>
    <div className="rf-result-line"><strong>{result.total}</strong><span>{verdict}</span></div>
    {outcome ? <details open><summary>Ergebnisbereiche dieses Wurfs</summary><ol className="rf-trace">
      {outcome.comparisons.map((c, i) => <li key={c.id}><span>{bands?.find(b => b.id === c.id)?.label ?? c.id}</span><strong>Ergebnis {OUTCOME_COMPARISON_SYMBOL[c.comparison] ?? c.comparison} {c.threshold}</strong><small>{i === outcome.matchedBand ? "Ausgewählt" : c.matched ? "Erfüllt, aber nachrangig" : "Nicht erfüllt"}</small></li>)}
      {fallback ? <li><span>{fallback.label}</span><strong>Sonst</strong><small>{outcome.matchedBand === null ? "Ausgewählt" : "Nicht ausgewählt"}</small></li> : null}
    </ol></details> : null}
    {result.dice.map(die => <p key={die.path} className="rf-dice-line">W{die.sides}: {die.rolls.map(rolls => `[${rolls.join(" + ")}]`).join(" ")} · gewertet {die.kept.map(i => i + 1).join(", ")} · Summe {die.total}{die.capped ? " · Zusatzwurfgrenze erreicht" : ""}</p>)}
    <details><summary>Rechenweg und Wissensbelege</summary><ol className="rf-trace">{result.trace.map((step, i) => <li key={`${step.path}-${i}`}><span>{step.label ?? TRACE_KIND_LABEL[step.kind] ?? step.kind}</span><strong>{String(step.value)}</strong>{step.evidence?.length ? <small>Belege: {step.evidence.join(", ")}</small> : null}</li>)}</ol><p className="rf-help">{operations} Rechenschritte · {result.rngAlgorithm}</p></details>
  </div>;
}
