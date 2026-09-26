// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Dices, Ghost, Plus, Rocket, Sparkles, Swords, X } from "lucide-react";
import { Button, Notice, StepList, announce, focusHeading, tabKeyTarget } from "@chronicle/ui";
import { RULE_LIMITS, evaluateSupportedAction, type AnyRulePackage, type Scalar } from "@chronicle/rules";
import { t } from "../i18n";
import { Begriff } from "./Begriff";
import type { BegriffId } from "./begriffe";
import { explainValidationError } from "./forge-navigation-model";
import { LiveSheet, type Fixture } from "./RuleForgePreview";
import { vitalColorClass } from "./Vitalanzeige";
import { validateDraft, type RuleDraft } from "./rule-forge-model";
import { GENRES, SYSTEMS, defaultAnswers, genreAttributes, genreLabel, genreSkills, systemExample, systemExplanation, systemTitle, withGenre, wizardDraft, wizardProblems, type WizardAnswers, type WizardGenre, type WizardSystem } from "./rule-wizard-model";
import "./rule-wizard.css";

type Step = "name" | "dice" | "attributes" | "bars" | "skills" | "done";
const STEPS: readonly Step[] = ["name", "dice", "attributes", "bars", "skills", "done"];
/** Dieselben Wörter wie in der Werkbank: wer hier „Attribute“ lernt, findet sie dort wieder (Spec E6). */
function stepLabel(step: Step): string {
  switch (step) { case "name": return t("Name"); case "dice": return t("Würfel"); case "attributes": return t("Attribute"); case "bars": return t("Balken"); case "skills": return t("Fertigkeiten"); case "done": return t("Fertig"); }
}
/** Der Begriff, den ein Schritt einführt; er steht erklärbar direkt unter der Frage (Spec E13). */
const STEP_TERM: Partial<Record<Step, BegriffId>> = { name: "regelwerk", dice: "aktion", attributes: "attribut", bars: "balken", done: "bogen" };
const QUESTION = "rw-question";
/** Auswahlgruppe mit Pfeiltasten: nur die gewählte Möglichkeit ist per Tab erreichbar, die Pfeile wählen die nächste. */
function radioKeys<T extends string>(event: KeyboardEvent<HTMLButtonElement>, values: readonly T[], value: T, idPrefix: string, choose: (next: T) => void): void {
  const next = tabKeyTarget(event.key, values.indexOf(value), values.length);
  if (next === null) return;
  event.preventDefault(); const target = values[next]!; choose(target); document.getElementById(`${idPrefix}-${target}`)?.focus();
}
/** Auf breiten Schirmen steht der Bogen neben der Frage; auf schmalen klappt man ihn unter der Frage auf. */
const wide = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1101px)").matches;
const SYSTEM_KEYS = Object.keys(SYSTEMS) as WizardSystem[];
const GENRE_ICON: Record<WizardGenre, ReactNode> = { fantasy: <Swords size={22} />, scifi: <Rocket size={22} />, horror: <Ghost size={22} />, gegenwart: <Building2 size={22} />, eigenes: <Sparkles size={22} /> };
const percent = (value: number) => Math.round(value * 100);
function randomSeed(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes); else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  if (bytes.every(byte => byte === 0)) bytes[15] = 1;
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Der Regelwerk-Assistent: eine Frage je Schritt, in Alltagssprache, und rechts wächst der Bogen mit.
 * Wer das System nicht kennt, kommt so in wenigen Minuten zu einem spielbaren Regelwerk; die
 * Werkbank verfeinert es danach.
 */
export function RuleWizard({ authorName, installed, onCancel, onCreate }: { authorName: string; installed: readonly AnyRulePackage[]; onCancel(): void; onCreate(draft: RuleDraft): void }) {
  const [step, setStep] = useState<Step>("name"), [answers, setAnswers] = useState<WizardAnswers>(() => defaultAnswers());
  const [values, setValues] = useState<Record<string, Scalar>>({}), [roll, setRoll] = useState<{ action: string; text: string; success: boolean } | null>(null);
  const draft = useMemo(() => wizardDraft(answers, authorName, installed), [answers, authorName, installed]);
  const checked = useMemo(() => validateDraft(draft), [draft]);
  const pkg = checked.valid ? checked.value : null, problems = wizardProblems(answers);
  const index = STEPS.indexOf(step), next = STEPS[index + 1], previous = STEPS[index - 1];
  const set = (patch: Partial<WizardAnswers>) => { setAnswers(current => ({ ...current, ...patch })); setRoll(null); };
  const fixture: Fixture = { id: "assistent", name: t("Beispielfigur"), values, inputs: {}, passages: [] };
  const spec = SYSTEMS[answers.system];
  const firstAttribute = answers.attributes[0] ?? t("Stärke");
  const top = useRef<HTMLDivElement>(null), [sheetOpen, setSheetOpen] = useState(wide);
  /** Ein Schrittwechsel setzt den Fokus auf die neue Frage und sagt an, wo man steht (Spec E4). */
  const go = (target: Step) => {
    setStep(target); focusHeading(QUESTION);
    announce(t("Schritt {n} von {gesamt}: {titel}", { n: STEPS.indexOf(target) + 1, gesamt: STEPS.length, titel: stepLabel(target) }));
  };
  // Jede neue Frage beginnt oben; „Weiter“ steht unten, die Frage sonst ausserhalb des Blicks.
  useEffect(() => { const node = top.current, stage = node?.closest<HTMLElement>(".main-stage"); if (node && stage) stage.scrollTo({ top: stage.scrollTop + node.getBoundingClientRect().top - stage.getBoundingClientRect().top - 12 }); }, [step]);

  const testRoll = (actionId: string) => {
    if (!pkg) return;
    const action = pkg.actions.find(row => row.id === actionId); if (!action) return;
    try {
      const actor = Object.fromEntries(Object.entries(pkg.fields).map(([id, field]) => [id, Object.hasOwn(values, id) ? values[id]! : field.default]));
      const result = evaluateSupportedAction(pkg, actionId, { seed: randomSeed(), actor, input: {}, knowledge: { actorId: "assistent", passages: [] } });
      const dice = result.dice.map(die => die.rolls.flat().join(" + ")).join(" · ");
      const verdict = result.schemaVersion === 2 && result.outcome ? result.outcome.label : result.success ? t("Gelungen") : t("Misslungen");
      setRoll({ action: action.name, text: t("Gewürfelt: {wuerfel}. Ergebnis {summe}: {urteil}.", { wuerfel: dice, summe: result.total, urteil: verdict }), success: !!result.success });
    } catch (error) { setRoll({ action: action.name, text: error instanceof Error ? explainValidationError(error.message) : t("Der Probewurf ließ sich nicht rechnen."), success: false }); }
  };

  const question = (): { title: string; lead: string; body: ReactNode } => {
    switch (step) {
      case "name": return { title: t("Wie soll dein Regelwerk heißen?"), lead: t("Dazu die Stimmung eurer Runde. Sie schlägt passende Attribute und Balken vor; ändern kannst du alles."), body: <>
        <label className="rw-name">{t("Name des Regelwerks")}<input value={answers.name} maxLength={RULE_LIMITS.label} placeholder={t("zum Beispiel Nordlicht")} onChange={event => set({ name: event.target.value })} /></label>
        <div className="rw-choices rw-choices-genre" role="radiogroup" aria-label={t("Stimmung")}>{GENRES.map(genre => <button type="button" role="radio" id={`rw-genre-${genre}`} aria-checked={answers.genre === genre} tabIndex={answers.genre === genre ? 0 : -1} key={genre} className="rw-choice"
          onKeyDown={event => radioKeys(event, GENRES, answers.genre, "rw-genre", next => setAnswers(current => withGenre(current, next)))} onClick={() => setAnswers(current => withGenre(current, genre))}>
          <span className="rw-choice-icon" aria-hidden="true">{GENRE_ICON[genre]}</span><strong>{genreLabel(genre)}</strong><small>{genreAttributes(genre).join(", ")}</small></button>)}</div>
      </> };
      case "dice": return { title: t("Wie wird bei euch gewürfelt?"), lead: t("Das ist das Herz jedes Regelwerks: wie eine Probe entschieden wird. Jede Art rechnet unterschiedlich; das Beispiel zeigt, wie."), body:
        <div className="rw-choices rw-choices-dice" role="radiogroup" aria-label={t("Würfelart")}>{SYSTEM_KEYS.map(system => { const s = SYSTEMS[system]; return <button type="button" role="radio" id={`rw-system-${system}`} aria-checked={answers.system === system} tabIndex={answers.system === system ? 0 : -1} key={system} className="rw-choice rw-choice-wide"
          onKeyDown={event => radioKeys(event, SYSTEM_KEYS, answers.system, "rw-system", next => set({ system: next }))} onClick={() => set({ system })}>
          <span className="rw-choice-icon" aria-hidden="true"><Dices size={22} /></span><strong>{systemTitle(system)}</strong><span>{systemExplanation(system)}</span>
          <span className="rw-example">{systemExample(system, firstAttribute)}</span>
          <small>{t("Bei einem mittleren Wert ({wert}) gelingt es in {prozent} von 100 Würfen.", { wert: s.attribute.start, prozent: percent(s.chance(s.attribute.start)) })}</small></button>; })}</div> };
      case "attributes": return { title: t("Was zeichnet eine Figur aus?"), lead: t("Attribute sind die Zahlen auf dem Bogen, mit denen gewürfelt wird, hier von {min} bis {max}, zum Beispiel Stärke. Tippe einen Vorschlag an, um ihn zu nehmen oder wegzulassen.", { min: spec.attribute.min, max: spec.attribute.max }), body: <ChipEditor
        suggestions={genreAttributes(answers.genre)} chosen={answers.attributes} addLabel={t("Eigenes Attribut")} placeholder={t("zum Beispiel Mut")}
        onChange={attributes => set({ attributes, skills: answers.skills.filter(skill => attributes.includes(skill.attribute)) })} /> };
      case "bars": return { title: t("Was wird im Spiel verbraucht?"), lead: t("Balken sind Vorräte, die im Spiel sinken und steigen, zum Beispiel Leben oder Mana. Sie stehen als farbige Balken auf dem Bogen."), body: <div className="rw-bars">
        {answers.bars.map((bar, i) => { const update = (patch: Partial<typeof bar>) => set({ bars: answers.bars.map((row, n) => n === i ? { ...row, ...patch } : row) }); return <div className={`rw-bar${bar.on ? " is-on" : ""}`} key={bar.key}>
          <label className="rf-check"><input type="checkbox" checked={bar.on} onChange={event => update({ on: event.target.checked })} /><span className="sr-only">{t("{name} verwenden", { name: bar.label })}</span></label>
          <span className={`rw-bar-swatch${vitalColorClass(bar.color)}`} aria-hidden="true"><span /></span>
          <input aria-label={t("Name des Balkens")} value={bar.label} maxLength={RULE_LIMITS.label} onChange={event => update({ label: event.target.value })} />
          <label className="rf-check rw-bar-defeat"><input type="checkbox" checked={bar.defeat} disabled={!bar.on} onChange={event => update({ defeat: event.target.checked })} />{t("Bei 0 ist die Figur besiegt")}</label>
        </div>; })}
        <Button variant="quiet" onClick={() => set({ bars: [...answers.bars, { key: `eigen_${answers.bars.length}`, label: t("Neuer Balken"), on: true, color: "grey", defeat: false }] })}><Plus size={15} aria-hidden="true" />{t("Eigener Balken")}</Button>
      </div> };
      case "skills": return { title: t("Welche Fertigkeiten gibt es?"), lead: t("Für jedes Attribut gibt es schon eine Probe. Fertigkeiten sind weitere Proben, jede auf ein Attribut, zum Beispiel Klettern auf Stärke. Du kannst diesen Schritt überspringen."), body: <SkillEditor answers={answers} onChange={set} /> };
      case "done": return { title: t("Fertig. So spielt sich dein Regelwerk."), lead: t("Probier eine Probe aus. Danach legst du das Regelwerk an und verfeinerst es in der Werkbank, wann immer du willst."), body: <div className="rw-done">
        <ul className="rw-summary">
          <li><strong>{answers.attributes.length}</strong>{t("Attribute")}</li>
          <li><strong>{answers.bars.filter(bar => bar.on).length}</strong>{t("Balken")}</li>
          <li><strong>{pkg?.actions.length ?? 0}</strong>{t("Proben")}</li>
        </ul>
        {problems.length ? <Notice error>{problems.join(" ")}</Notice> : !pkg ? <Notice error>{checked.valid ? "" : explainValidationError(checked.error)}</Notice> : <div className="rw-roll">
          <p>{t("Probewurf für die Beispielfigur:")}</p>
          <div className="rw-roll-buttons">{pkg.actions.slice(0, 12).map(action => <Button key={action.id} variant="quiet" onClick={() => testRoll(action.id)}><Dices size={15} />{action.name}</Button>)}</div>
          {roll ? <p className={`rw-roll-result${roll.success ? " is-success" : ""}`} role="status"><strong>{roll.action}</strong> {roll.text}</p> : null}
        </div>}
      </div> };
    }
  };
  const current = question(), term = STEP_TERM[step];
  return <div className="rw" ref={top}>
    <div className="rw-head">
      <Button variant="quiet" onClick={onCancel}><X size={15} aria-hidden="true" />{t("Assistent schließen")}</Button>
      <StepList label={t("Schritte des Assistenten")} className="rw-steps" steps={STEPS.map((row, i) => ({ id: row, label: stepLabel(row), state: i < index ? "done" : i === index ? "current" : "todo", onSelect: () => go(row) }))} />
    </div>
    <div className="rw-body">
      <section className="rw-question" aria-labelledby={QUESTION}>
        <p className="rw-count">{t("Schritt {n} von {gesamt}", { n: index + 1, gesamt: STEPS.length })}</p>
        <h2 id={QUESTION} tabIndex={-1}>{current.title}</h2>
        <p className="rw-lead">{current.lead}</p>
        {term ? <p className="rf-begriffe"><span>{t("Begriffe:")}</span> <Begriff id={term} /></p> : null}
        {current.body}
        {/* Die Knöpfe gehören zur Frage: sie stehen unter ihr, nicht über dem Bogen daneben. */}
        <div className="rw-foot">
          {previous ? <Button variant="quiet" onClick={() => go(previous)}><ArrowLeft size={15} aria-hidden="true" />{t("Zurück")}</Button> : <span />}
          {next ? <Button variant="primary" onClick={() => go(next)}>{t("Weiter: {schritt}", { schritt: stepLabel(next) })}<ArrowRight size={15} aria-hidden="true" /></Button>
            : <Button variant="primary" disabled={!pkg || problems.length > 0} aria-describedby={!pkg || problems.length ? "rw-create-reason" : undefined} onClick={() => onCreate(draft)}><Check size={15} aria-hidden="true" />{t("Regelwerk anlegen")}</Button>}
        </div>
        {!next && (!pkg || problems.length) ? <p className="rf-help" id="rw-create-reason">{t("Anlegen geht, sobald die Hinweise oben erledigt sind.")}</p> : null}
      </section>
      <aside className="rw-sheet" aria-label={t("Dein Bogen")}>
        <details className="rw-sheet-toggle" open={sheetOpen} onToggle={event => setSheetOpen(event.currentTarget.open)}>
          <summary>{t("Bogen ansehen")}</summary>
          <div className="rw-paper">
            <h3>{answers.name.trim() || t("Dein Regelwerk")}</h3>
            <p className="rf-help">{t("So sieht der Bogen jeder Figur aus. Er wächst mit deinen Antworten; die Werte hier kannst du zum Ausprobieren ändern.")}</p>
            {pkg ? <LiveSheet pkg={pkg} fixture={fixture} onChange={setValues} /> : <p className="rf-help">{t("Der Bogen erscheint, sobald ein Attribut gewählt ist.")}</p>}
          </div>
        </details>
      </aside>
    </div>
  </div>;
}

/** Vorschläge als Chips zum An- und Abwählen, dazu eigene Einträge. */
function ChipEditor({ suggestions, chosen, onChange, addLabel, placeholder }: { suggestions: readonly string[]; chosen: readonly string[]; onChange(values: string[]): void; addLabel: string; placeholder: string }) {
  const [text, setText] = useState("");
  const own = chosen.filter(value => !suggestions.includes(value));
  const add = () => { const value = text.trim(); if (!value || chosen.includes(value)) return; onChange([...chosen, value]); setText(""); };
  return <div className="rw-chips-block">
    <div className="rw-chips">{suggestions.map(value => { const on = chosen.includes(value); return <button type="button" key={value} className="rw-chip" aria-pressed={on} onClick={() => onChange(on ? chosen.filter(row => row !== value) : [...chosen, value])}>{on ? <Check size={14} /> : <Plus size={14} />}{value}</button>; })}
      {own.map(value => <span className="rw-chip rw-chip-own" key={value}>{value}<button type="button" aria-label={t("{name} entfernen", { name: value })} onClick={() => onChange(chosen.filter(row => row !== value))}><X size={13} /></button></span>)}</div>
    <div className="rw-add"><input value={text} maxLength={RULE_LIMITS.label} placeholder={placeholder} aria-label={addLabel} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /><Button onClick={add} disabled={!text.trim()}><Plus size={15} />{addLabel}</Button></div>
  </div>;
}

function SkillEditor({ answers, onChange }: { answers: WizardAnswers; onChange(patch: Partial<WizardAnswers>): void }) {
  const [text, setText] = useState("");
  const suggestions = genreSkills(answers.genre).map(skill => ({ name: skill.name, attribute: genreAttributes(answers.genre)[skill.attribute]! })).filter(skill => answers.attributes.includes(skill.attribute));
  const chosen = new Set(answers.skills.map(skill => skill.name));
  const add = () => { const name = text.trim(); if (!name || chosen.has(name) || !answers.attributes.length) return; onChange({ skills: [...answers.skills, { name, attribute: answers.attributes[0]! }] }); setText(""); };
  return <div className="rw-skills">
    <label className="rf-check rw-skill-values"><input type="checkbox" checked={answers.skillValues} onChange={event => onChange({ skillValues: event.target.checked })} /><span><strong>{t("Fertigkeiten haben eigene Werte")}</strong><small>{t("Dann kommt der Fertigkeitswert zum Attribut dazu, und Figuren können sich in einer Fertigkeit verbessern.")}</small></span></label>
    {suggestions.length ? <div className="rw-chips">{suggestions.map(skill => { const on = chosen.has(skill.name); return <button type="button" key={skill.name} className="rw-chip" aria-pressed={on} onClick={() => onChange({ skills: on ? answers.skills.filter(row => row.name !== skill.name) : [...answers.skills, skill] })}>{on ? <Check size={14} /> : <Plus size={14} />}{t("{name} auf {eigenschaft}", { name: skill.name, eigenschaft: skill.attribute })}</button>; })}</div> : null}
    {answers.skills.length ? <ul className="rw-skill-list">{answers.skills.map((skill, i) => <li key={`${skill.name}-${i}`}>
      <input aria-label={t("Name der Fertigkeit")} value={skill.name} maxLength={RULE_LIMITS.label} onChange={event => onChange({ skills: answers.skills.map((row, n) => n === i ? { ...row, name: event.target.value } : row) })} />
      <select aria-label={t("Attribut für {name}", { name: skill.name })} value={skill.attribute} onChange={event => onChange({ skills: answers.skills.map((row, n) => n === i ? { ...row, attribute: event.target.value } : row) })}>{answers.attributes.map(attribute => <option key={attribute} value={attribute}>{attribute}</option>)}</select>
      <Button variant="quiet" aria-label={t("{name} entfernen", { name: skill.name })} onClick={() => onChange({ skills: answers.skills.filter((_, n) => n !== i) })}><X size={14} /></Button>
    </li>)}</ul> : null}
    <div className="rw-add"><input value={text} maxLength={RULE_LIMITS.label} placeholder={t("zum Beispiel Reiten")} aria-label={t("Eigene Fertigkeit")} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /><Button onClick={add} disabled={!text.trim()}><Plus size={15} />{t("Eigene Fertigkeit")}</Button></div>
  </div>;
}
