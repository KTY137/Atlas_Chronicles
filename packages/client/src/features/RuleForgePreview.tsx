import { useMemo, useState } from "react";
import { Plus, TestTubeDiagonal, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { evaluateAction, RULE_LIMITS, type ActionResult, type Experience, type RulePackage, type Scalar } from "@chronicle/rules";
import { RuleFields } from "./RuleFields";
import { copyJson, fixtureValues, localKey, type PackageSelfTest } from "./rule-forge-model";

interface SamplePassage { localId: string; passageId: string; labels: string; experience: Experience }
interface Fixture { id: string; name: string; values: Record<string, Scalar>; inputs: Record<string, Record<string, Scalar>>; passages: SamplePassage[] }
const initialFixtures = (): Fixture[] => [
  { id: "fixture-sera", name: "Sera", values: {}, inputs: {}, passages: [{ localId: localKey(), passageId: "beispiel-spur", labels: "spuren", experience: "erfahren" }] },
  { id: "fixture-brannt", name: "Brannt", values: {}, inputs: {}, passages: [] },
];

/** Pure, reproducible examples. This component never writes a campaign sheet or roll. */
export function RuleForgePreview({ pkg, onSaveTest }: { pkg: RulePackage | null; onSaveTest?: (test: PackageSelfTest) => void }) {
  const [fixtures, setFixtures] = useState(initialFixtures), [selected, setSelected] = useState("");
  const [seed, setSeed] = useState("00000001000000020000000300000004");
  const action = pkg?.actions.find(a => a.id === selected) ?? pkg?.actions[0];
  const update = (id: string, change: Partial<Fixture>) => setFixtures(items => items.map(f => f.id === id ? { ...f, ...change } : f));
  return <section className="rf-preview" aria-labelledby="rf-preview-title">
    <div className="rf-section-heading"><h2 id="rf-preview-title"><TestTubeDiagonal size={20} />Testtafel</h2><span className="rf-node-badge">Nur Beispiele</span></div>
    <p>Vergleiche zwei Figuren mit unterschiedlichem Wissen. Beide erhalten denselben Würfelstart. Die Beispiele verändern keine Charaktere oder Würfe deiner Runde.</p>
    {!pkg ? <Notice>Die Testtafel wird verfügbar, sobald der Entwurf gültig ist.</Notice> : !action ? <Notice>Lege eine Aktion an, um das Regelwerk zu erproben.</Notice> : <>
      <div className="rf-form-grid"><label>Aktion<select value={action.id} onChange={e => setSelected(e.target.value)}>{pkg.actions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Würfelstart für reproduzierbare Tests<input value={seed} maxLength={32} spellCheck={false} onChange={e => setSeed(e.target.value)} /><small>32 Hexadezimalzeichen, nicht ausschließlich Nullen.</small></label></div>
      <p className="rf-disclosure">{action.disclosure}</p>
      <div className="rf-fixtures">{fixtures.map(fixture => <FixturePanel key={fixture.id} pkg={pkg} actionId={action.id} fixture={fixture} seed={seed} onChange={change => update(fixture.id, change)} onSaveTest={onSaveTest} />)}</div>
    </>}
  </section>;
}

function FixturePanel({ pkg, actionId, fixture, seed, onChange, onSaveTest }: {
  pkg: RulePackage; actionId: string; fixture: Fixture; seed: string; onChange(change: Partial<Fixture>): void; onSaveTest?: (test: PackageSelfTest) => void;
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
    <h3>{fixture.name}</h3>
    <label>Name der Testfigur<input value={fixture.name} maxLength={120} onChange={e => onChange({ name: e.target.value })} /></label>
    {pkg.layout.sections.map(section => <fieldset className="rf-sheet-section" key={section.id}><legend>{section.label}</legend><RuleFields fields={Object.fromEntries(section.fields.map(id => [id, pkg.fields[id]!]))} values={values} onChange={next => onChange({ values: next })} /></fieldset>)}
    {Object.keys(remaining).length ? <fieldset className="rf-sheet-section"><legend>Weitere Felder</legend><RuleFields fields={remaining} values={values} onChange={next => onChange({ values: next })} /></fieldset> : null}
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
    {evaluation.error !== undefined ? <Notice error>{evaluation.error}</Notice> : <>
      <FixtureResult result={evaluation.result} />
      {onSaveTest ? <div className="rf-save-test"><label>Testname<input value={testName} placeholder={`${fixture.name}: ${action.name}`} maxLength={120} onChange={e => setTestName(e.target.value)} /></label><Button onClick={() => onSaveTest(copyJson({ name: testName.trim() || `${fixture.name}: ${action.name}`.slice(0, 120), actionId, context: evaluation.result.context, expectedTotal: evaluation.result.total }))}>Als Pakettest speichern</Button></div> : null}
    </>}
  </article>;
}

function FixtureResult({ result }: { result: ActionResult }) {
  return <div className="rf-fixture-result" aria-live="polite"><div className="rf-result-line"><strong>{result.total}</strong><span>{result.success === undefined ? "Beispielergebnis" : result.success ? "Schwelle erreicht" : "Schwelle verfehlt"}</span></div>
    {result.dice.map(die => <p key={die.path} className="rf-dice-line">W{die.sides}: {die.rolls.map(rolls => `[${rolls.join(" + ")}]`).join(" ")} · gewertet {die.kept.map(i => i + 1).join(", ")} · Summe {die.total}{die.capped ? " · Zusatzwurfgrenze erreicht" : ""}</p>)}
    <details><summary>Rechenweg und Wissensbelege</summary><ol className="rf-trace">{result.trace.map((step, i) => <li key={`${step.path}-${i}`}><span>{step.label ?? step.kind}</span><strong>{String(step.value)}</strong>{step.evidence?.length ? <small>Belege: {step.evidence.join(", ")}</small> : null}</li>)}</ol><p className="rf-help">{result.operations} Rechenschritte · {result.rngAlgorithm}</p></details>
  </div>;
}
