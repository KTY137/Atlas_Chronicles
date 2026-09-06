import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, BookOpen, Check, Download, FlaskConical, Hammer, Plus, Trash2, Upload } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { ENGINE_VERSION, RULE_LIMITS, parseRulePackage, stableJson, type FieldSchema, type FormulaType, type MigrationPreview, type PackagePin, type RulePackage } from "@chronicle/rules";
import { ApiError, api, apiPath, errorText, type Campaign } from "../api";
import { useResource, useTask } from "../hooks";
import { FormulaBuilder } from "./FormulaBuilder";
import { RuleForgePreview } from "./RuleForgePreview";
import type { RulesState } from "./game-api";
import { changeFieldType, draftExpression, fieldTypes, forkPackage, localKey, migrationStepDraft, moveItem, newAction, newField, newPackage, packageDraft, packageTestResults, uniqueId, validateDraft, type DraftAction, type DraftField, type DraftMigration, type DraftMigrationStep, type DraftSection, type RuleDraft } from "./rule-forge-model";
import "./rule-forge.css";

interface RuleReview { from: PackagePin; to: PackagePin; pinVersion: number; migration: MigrationPreview | null; previewHash: string }
type EditorTab = "package" | "fields" | "sheet" | "actions" | "tests" | "migrations";
const tabs: [EditorTab, string][] = [["package", "Paket"], ["fields", "Felder"], ["sheet", "Bogen"], ["actions", "Aktionen"], ["tests", "Pakettests"], ["migrations", "Migration"]];
const packageKey = (pkg: PackagePin) => `${pkg.id}@${pkg.version}`;
function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, current: EditorTab, onChange: (tab: EditorTab) => void) {
  const index = tabs.findIndex(([id]) => id === current);
  const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
  if (next < 0) return; event.preventDefault(); const id = tabs[next]![0]; onChange(id); document.getElementById(`rf-tab-${id}`)?.focus();
}

export function RuleForge({ campaign, authorName, onDirty, onActivated }: { campaign: Campaign; authorName: string; onDirty(dirty: boolean): void; onActivated?: () => void }) {
  const [revision, setRevision] = useState(0), resource = useResource<RulesState>(apiPath(campaign.id, "/rules"), revision), task = useTask();
  const [selected, setSelected] = useState<string | null>(null), [draft, setDraft] = useState<RuleDraft | null>(null), [locked, setLocked] = useState(false), [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<EditorTab>("package"), [review, setReview] = useState<(RuleReview & { fingerprint: string }) | null>(null), [acknowledged, setAcknowledged] = useState(false), [notice, setNotice] = useState("");
  const [justInstalled, setJustInstalled] = useState<RulePackage | null>(null), upload = useRef<HTMLInputElement>(null);
  const packages = useMemo(() => { const values = resource.data?.packages ?? []; return justInstalled && !values.some(p => packageKey(p) === packageKey(justInstalled)) ? [...values, justInstalled] : values; }, [resource.data, justInstalled]);
  const base = packages.find(p => packageKey(p) === selected) ?? packages.find(p => resource.data && packageKey(p) === packageKey(resource.data.pin)) ?? packages[0];
  const baseDraft = useMemo(() => base ? packageDraft(base) : null, [base]), current = draft ?? baseDraft;
  const validation = useMemo(() => current ? validateDraft(current) : null, [current]), pkg = validation?.valid ? validation.value : null;
  const fingerprint = useMemo(() => pkg ? stableJson(pkg) : "", [pkg]);
  const tests = useMemo(() => pkg ? packageTestResults(pkg) : [], [pkg]), testsPass = tests.every(test => test.passed);
  const installed = pkg ? packages.find(p => packageKey(p) === packageKey(pkg)) : undefined;
  const exactInstalled = !!installed && stableJson(installed) === fingerprint, collision = !!installed && !exactInstalled;
  const editable = draft !== null && !locked, active = !!pkg && !!resource.data && packageKey(pkg) === packageKey(resource.data.pin);
  const readyReview = review?.fingerprint === fingerprint ? review : null;
  const setDirtyState = (value: boolean) => { setDirty(value); onDirty(value); };
  const clearReview = () => { setReview(null); setAcknowledged(false); setNotice(""); task.setError(""); };
  const edit = (next: RuleDraft) => { setDraft(next); setDirtyState(true); clearReview(); };
  const canReplace = () => !dirty || window.confirm("Ungespeicherten Regelentwurf verwerfen? Lade ihn vorher als Datei herunter, wenn du ihn behalten möchtest.");
  const selectPackage = (next: RulePackage) => { if (!canReplace()) return; setSelected(packageKey(next)); setDraft(null); setLocked(false); setDirtyState(false); clearReview(); };
  const begin = (next: RuleDraft) => { if (!canReplace()) return; setDraft(next); setLocked(false); setDirtyState(true); clearReview(); setTab("package"); };
  const refresh = () => { setRevision(v => v + 1); setReview(null); setAcknowledged(false); };
  const runPreview = () => { if (!pkg) return; void task.run(async () => {
    setReview(null); setAcknowledged(false); setNotice("");
    const result = await api<RuleReview>(apiPath(campaign.id, "/rules/preview"), { method: "POST", body: { package: pkg } });
    setReview({ ...result, fingerprint });
  }); };
  const install = () => { if (!pkg || collision || !testsPass) return; void task.run(async () => {
    const result = await api<RulePackage>(apiPath(campaign.id, "/rules"), { method: "POST", body: pkg });
    setJustInstalled(result); setDraft(packageDraft(result)); setSelected(packageKey(result)); setLocked(true); setDirtyState(false); setRevision(v => v + 1);
    setNotice("Paketversion installiert. Für die Runde wird sie erst durch die ausdrückliche Aktivierung wirksam.");
  }); };
  const activate = () => { if (!pkg || !readyReview || !exactInstalled) return; void task.run(async () => {
    try { await api(apiPath(campaign.id, "/rules/activate"), { method: "POST", body: { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: readyReview.pinVersion, previewHash: readyReview.previewHash } }); }
    catch (error) { if (error instanceof ApiError && error.status === 409) { refresh(); throw new Error("Die Runde hat sich seit der Vorschau verändert. Prüfe die Migration erneut und bestätige die aktuelle Vorschau."); } throw error; }
    setNotice(`Für diese Runde ist jetzt ${pkg.name} ${pkg.version} aktiv.`); setDirtyState(false); refresh(); onActivated?.();
  }); };
  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file || !canReplace()) return;
    void task.run(async () => { if (file.size > RULE_LIMITS.packageBytes) throw new Error("Das Regelpaket darf höchstens 1 MiB groß sein."); const next = packageDraft(parseRulePackage(await file.text())); setDraft(next); setLocked(false); setDirtyState(true); clearReview(); setTab("package"); });
  };
  const download = () => {
    if (!pkg) return; const url = URL.createObjectURL(new Blob([JSON.stringify(pkg, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${pkg.id}-${pkg.version}.rules.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (campaign.role !== "leitung") return <Notice>Die Regelwerkstatt steht der Spielleitung zur Verfügung.</Notice>;
  if (resource.loading && !resource.data) return <Loading text="Regelpakete werden geladen …" />;
  return <div className="rule-forge">
    <header className="rf-header"><div><span className="eyebrow">Regeln für {campaign.name}</span><h1><Hammer size={26} />Regelwerkstatt</h1><p>Baue Felder und Aktionen, prüfe Beispiele und wähle bewusst, welche Version am Tisch gilt.</p></div><div className="rf-toolbar"><Button disabled={task.busy} onClick={() => begin(newPackage(authorName, packages))}><Plus size={16} />Neues Paket</Button><Button disabled={task.busy} onClick={() => upload.current?.click()}><Upload size={16} />Paket öffnen</Button><input ref={upload} type="file" accept=".json,application/json" hidden onChange={importFile} disabled={task.busy} /></div></header>
    {resource.error ? <Notice error>{resource.error} <Button disabled={task.busy} onClick={refresh}>Erneut laden</Button></Notice> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    <div className="rf-workspace"><aside className="rf-catalog" aria-label="Installierte Regelpakete"><div className="rf-section-heading"><h2><BookOpen size={18} />Bibliothek</h2><Button variant="quiet" disabled={task.busy} onClick={refresh} aria-label="Paketbibliothek aktualisieren">↻</Button></div>
      <p className="rf-help">Installierte Versionen bleiben unveränderlich.</p>
      {packages.map(item => <button type="button" key={packageKey(item)} className={`rf-catalog-item ${!editable && current?.id === item.id && current.version === item.version ? "is-selected" : ""}`} disabled={task.busy} onClick={() => selectPackage(item)} aria-pressed={!editable && current?.id === item.id && current.version === item.version}><strong>{item.name}</strong><span>{item.version}{resource.data && packageKey(item) === packageKey(resource.data.pin) ? " · Aktiv in dieser Runde" : " · Installiert"}</span><small>{item.id}</small></button>)}
      {!packages.length ? <p>Noch kein Paket geladen. Du kannst einen Entwurf anlegen oder eine Paketdatei öffnen.</p> : null}
    </aside><section className="rf-editor" aria-label="Regelpaket">
      {current ? <><div className="rf-section-heading"><div><h2>{current.name || "Unbenanntes Regelpaket"}</h2><span className="rf-help">{editable ? dirty ? "Ungespeicherter Entwurf" : "Entwurf" : "Installierte Version · schreibgeschützt"} · {current.version}</span></div><div className="rf-toolbar">
        {!editable && pkg ? <Button disabled={task.busy} onClick={() => { try { begin(forkPackage(pkg, packages)); } catch (error) { task.setError(errorText(error)); } }}>Neue Version erstellen</Button> : null}
        <Button disabled={!pkg || task.busy} onClick={download}><Download size={15} />Paketdatei</Button></div></div>
        <div className="rf-tabs" role="tablist" aria-label="Regelpaket bearbeiten">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-controls={`rf-panel-${id}`} id={`rf-tab-${id}`} tabIndex={tab === id ? 0 : -1} onKeyDown={event => navigateTabs(event, id, setTab)} onClick={() => setTab(id)}>{label}{id === "tests" && current.selfTests.length ? ` (${current.selfTests.length})` : ""}</button>)}</div>
        <fieldset className="rf-editor-fields" disabled={tab !== "actions" && (!editable || task.busy)}><div role="tabpanel" id={`rf-panel-${tab}`} aria-labelledby={`rf-tab-${tab}`}>
          {tab === "package" ? <PackageEditor draft={current} onChange={edit} /> : null}
          {tab === "fields" ? <FieldList title="Charakterfelder" fields={current.fields} onChange={fields => edit({ ...current, fields, sections: current.sections.map(s => ({ ...s, fieldKeys: s.fieldKeys.filter(id => fields.some(f => f.localId === id)) })) })} /> : null}
          {tab === "sheet" ? <SheetEditor fields={current.fields} sections={current.sections} onChange={sections => edit({ ...current, sections })} /> : null}
          {tab === "actions" ? <ActionEditor draft={current} disabled={!editable || task.busy} onChange={actions => edit({ ...current, actions })} /> : null}
          {tab === "tests" ? <><h3>Pakettests</h3><p>Speichere Beispiele aus der Testtafel als feste Erwartung. Bei der Installation werden alle enthaltenen Tests ausgeführt.</p>{!current.selfTests.length ? <p className="rf-help">Noch keine Pakettests. Unten auf der Testtafel kannst du für jede Figur ein Beispiel speichern.</p> : <div className="rf-test-list">{current.selfTests.map((test, i) => <article className="rf-card" key={i}><div className="rf-section-heading"><h4>{test.name}</h4><Button variant="quiet" aria-label={`Pakettest ${test.name} entfernen`} onClick={() => edit({ ...current, selfTests: current.selfTests.filter((_, n) => n !== i) })}><Trash2 size={15} />Entfernen</Button></div><p>{test.actionId} · Erwartet {test.expectedTotal} · {tests[i]?.passed ? "Bestanden" : tests[i]?.error ?? (tests[i]?.actual === undefined ? "Paket noch nicht gültig" : `Ergebnis ${tests[i].actual} weicht ab`)}</p><details><summary>Gespeicherte Beispielwerte</summary><dl className="rf-value-list"><dt>Würfelstart</dt><dd>{test.context.seed}</dd>{Object.entries(test.context.actor).map(([id, value]) => <div key={id}><dt>{id}</dt><dd>{String(value)}</dd></div>)}</dl><p>{test.context.knowledge.passages.length} gehaltene Beispielpassagen</p></details></article>)}</div>}</> : null}
          {tab === "migrations" ? <MigrationEditor draft={current} packages={packages} onChange={migrations => edit({ ...current, migrations })} /> : null}
        </div></fieldset>
        <div className="rf-validation" aria-live="polite">{validation && !validation.valid ? <Notice error>{validation.error}</Notice> : <p><Check size={16} />Paketstruktur, Feldtypen und Formeln gültig{tests.length ? ` · ${tests.filter(t => t.passed).length} von ${tests.length} Pakettests bestanden` : ""}.</p>}{collision ? <Notice error>Diese Kennung und Version sind bereits mit anderem Inhalt installiert. Wähle eine neue Version.</Notice> : null}</div>
        <div className="rf-publish"><h3>Prüfen und übernehmen</h3><p>Die Installation speichert eine unveränderliche Version. Die Aktivierung wechselt das Regelwerk dieser Runde und übernimmt die zuvor geprüften Feldänderungen.</p>
          <div className="rf-toolbar"><Button disabled={!pkg || !testsPass || collision || task.busy || active} onClick={runPreview}><FlaskConical size={16} />{readyReview ? "Vorschau erneuern" : "Aktivierung prüfen"}</Button><Button variant="primary" disabled={!pkg || !testsPass || collision || exactInstalled || task.busy} onClick={install}>{exactInstalled ? "Version ist installiert" : "Version installieren"}</Button></div>
          {active ? <p className="rf-help">Diese Paketversion ist bereits aktiv.</p> : null}
          {readyReview ? <ReviewPanel review={readyReview} acknowledged={acknowledged} onAcknowledge={setAcknowledged} disabled={task.busy} /> : null}
          {readyReview ? <Button variant="primary" disabled={task.busy || !exactInstalled || active || (!!readyReview.migration?.entities.length && !acknowledged)} onClick={activate}>Geprüfte Version für diese Runde aktivieren</Button> : null}
          {readyReview && !exactInstalled ? <p className="rf-help">Installiere zuerst genau diese geprüfte Version. Die Vorschau bleibt für die anschließende Aktivierung erhalten.</p> : null}
        </div>
      </> : <Notice>Wähle ein installiertes Paket oder beginne einen neuen Entwurf.</Notice>}
    </section></div>
    <RuleForgePreview pkg={pkg} onSaveTest={editable && current && !task.busy && current.selfTests.length < 64 ? test => edit({ ...current, includeSelfTests: true, selfTests: [...current.selfTests, test] }) : undefined} />
  </div>;
}

function PackageEditor({ draft, onChange }: { draft: RuleDraft; onChange(value: RuleDraft): void }) {
  return <><h3>Paketangaben</h3><div className="rf-form-grid"><label>Name<input value={draft.name} maxLength={120} required onChange={e => onChange({ ...draft, name: e.target.value })} /></label><label>Version<input value={draft.version} placeholder="1.0.0" required onChange={e => onChange({ ...draft, version: e.target.value })} /></label><label>Paketkennung<input value={draft.id} maxLength={128} placeholder="de.meine-runde.regelwerk" required onChange={e => onChange({ ...draft, id: e.target.value })} /><small>Namensraum mit Punkten, z. B. de.meine-runde.regelwerk.</small></label><label>Lizenz<input value={draft.license} maxLength={120} required onChange={e => onChange({ ...draft, license: e.target.value })} /></label></div>
    <h4>Urheberschaft</h4>{draft.authors.map((author, i) => <div className="rf-inline" key={i}><label>Autor:in {i + 1}<input value={author} maxLength={120} required onChange={e => onChange({ ...draft, authors: draft.authors.map((a, n) => n === i ? e.target.value : a) })} /></label><Button disabled={draft.authors.length <= 1} variant="quiet" aria-label={`Autor:in ${i + 1} entfernen`} onClick={() => onChange({ ...draft, authors: draft.authors.filter((_, n) => n !== i) })}><Trash2 size={15} /></Button></div>)}<Button disabled={draft.authors.length >= 32} onClick={() => onChange({ ...draft, authors: [...draft.authors, ""] })}><Plus size={15} />Weitere Urheberschaft</Button>
    <p className="rf-help">Dieses Paket verwendet die deklarativen Regelbausteine der Engine {ENGINE_VERSION}. Formeln können Werte berechnen und gehaltenes Wissen prüfen. Aktionen benötigen am Tisch eine menschliche Bestätigung.</p></>;
}

function OrderButtons({ index, length, onMove }: { index: number; length: number; onMove(delta: -1 | 1): void }) {
  return <span className="rf-order"><Button variant="quiet" disabled={index === 0} aria-label="Nach oben verschieben" onClick={() => onMove(-1)}><ArrowUp size={14} /></Button><Button variant="quiet" disabled={index === length - 1} aria-label="Nach unten verschieben" onClick={() => onMove(1)}><ArrowDown size={14} /></Button></span>;
}
function FieldList({ fields, onChange, title }: { fields: DraftField[]; onChange(fields: DraftField[]): void; title: string }) {
  return <><div className="rf-section-heading"><h3>{title}</h3><Button disabled={fields.length >= RULE_LIMITS.fields} onClick={() => onChange([...fields, newField(uniqueId("feld", fields.map(f => f.id)))])}><Plus size={15} />Feld hinzufügen</Button></div><p className="rf-help">Jedes Feld erhält einen Typ, eine Vorgabe und passende Grenzen. Kennungen werden in Formeln verwendet; für referenzierte Felder sind Buchstaben, Ziffern und Unterstriche geeignet.</p>
    {!fields.length ? <p>Noch keine Felder.</p> : null}{fields.map((field, index) => <FieldEditor key={field.localId} field={field} index={index} length={fields.length} onChange={next => onChange(fields.map(f => f.localId === field.localId ? next : f))} onRemove={() => onChange(fields.filter(f => f.localId !== field.localId))} onMove={delta => onChange(moveItem(fields, index, delta))} />)}</>;
}
function FieldEditor({ field, index, length, onChange, onRemove, onMove }: { field: DraftField; index: number; length: number; onChange(value: DraftField): void; onRemove(): void; onMove(delta: -1 | 1): void }) {
  return <article className="rf-card"><div className="rf-section-heading"><h4>{field.label || `Feld ${index + 1}`}</h4><span className="rf-toolbar"><OrderButtons index={index} length={length} onMove={onMove} /><Button variant="quiet" aria-label={`Feld ${field.label} entfernen`} onClick={onRemove}><Trash2 size={15} /></Button></span></div>
    <div className="rf-form-grid"><label>Bezeichnung<input value={field.label} maxLength={120} required onChange={e => onChange({ ...field, label: e.target.value })} /></label><label>Feldkennung<input value={field.id} maxLength={96} required spellCheck={false} onChange={e => onChange({ ...field, id: e.target.value })} /></label><label>Typ<select value={field.type} onChange={e => onChange(changeFieldType(field, e.target.value as FieldSchema["type"]))}><option value="integer">Ganze Zahl</option><option value="number">Zahl mit Nachkommastellen</option><option value="string">Text</option><option value="boolean">Wahr / falsch</option></select></label>
      <label>Vorgabewert{field.type === "boolean" ? <select value={field.defaultValue} onChange={e => onChange({ ...field, defaultValue: e.target.value })}><option value="false">Falsch</option><option value="true">Wahr</option></select> : <input value={field.defaultValue} type={field.type === "string" ? "text" : "number"} step={field.type === "integer" ? 1 : "any"} onChange={e => onChange({ ...field, defaultValue: e.target.value })} />}</label>
      {field.type === "integer" || field.type === "number" ? <><label>Minimum<input type="number" value={field.minimum} step={field.type === "integer" ? 1 : "any"} required onChange={e => onChange({ ...field, minimum: e.target.value })} /></label><label>Maximum<input type="number" value={field.maximum} step={field.type === "integer" ? 1 : "any"} required onChange={e => onChange({ ...field, maximum: e.target.value })} /></label></> : null}
      {field.type === "string" ? <label>Maximale Zeichen<input type="number" value={field.maxLength} min={1} max={4096} step={1} required onChange={e => onChange({ ...field, maxLength: e.target.value })} /></label> : null}
    </div>{field.type === "string" ? <><label className="rf-check"><input type="checkbox" checked={field.hasEnum} onChange={e => onChange({ ...field, hasEnum: e.target.checked, enumValues: e.target.checked && !field.enumValues.length ? [field.defaultValue || "Wert"] : field.enumValues })} />Auswahl auf festgelegte Texte beschränken</label>{field.hasEnum ? <div className="rf-enum">{field.enumValues.map((item, i) => <div className="rf-inline" key={i}><label>Auswahlwert {i + 1}<input value={item} maxLength={4096} onChange={e => onChange({ ...field, enumValues: field.enumValues.map((value, n) => n === i ? e.target.value : value) })} /></label><Button variant="quiet" aria-label={`Auswahlwert ${i + 1} entfernen`} onClick={() => onChange({ ...field, enumValues: field.enumValues.filter((_, n) => n !== i) })}><Trash2 size={14} /></Button></div>)}<Button disabled={field.enumValues.length >= 64} onClick={() => onChange({ ...field, enumValues: [...field.enumValues, ""] })}><Plus size={14} />Auswahlwert</Button></div> : null}</> : null}
  </article>;
}

function SheetEditor({ fields, sections, onChange }: { fields: DraftField[]; sections: DraftSection[]; onChange(sections: DraftSection[]): void }) {
  const update = (section: DraftSection) => onChange(sections.map(s => s.localId === section.localId ? section : s));
  return <><div className="rf-section-heading"><h3>Aufbau des Charakterbogens</h3><Button disabled={sections.length >= 32} onClick={() => onChange([...sections, { localId: localKey(), id: uniqueId("abschnitt", sections.map(s => s.id)), label: "Neuer Abschnitt", fieldKeys: [] }])}><Plus size={15} />Abschnitt</Button></div><p className="rf-help">Ordne Felder in Abschnitten an. Die Testtafel zeigt diesen Bogen unmittelbar mit Beispielwerten.</p>
    {sections.map((section, index) => <article className="rf-card" key={section.localId}><div className="rf-section-heading"><h4>{section.label}</h4><span className="rf-toolbar"><OrderButtons index={index} length={sections.length} onMove={delta => onChange(moveItem(sections, index, delta))} /><Button variant="quiet" aria-label={`Abschnitt ${section.label} entfernen`} onClick={() => onChange(sections.filter(s => s.localId !== section.localId))}><Trash2 size={15} /></Button></span></div><div className="rf-form-grid"><label>Titel<input value={section.label} maxLength={120} onChange={e => update({ ...section, label: e.target.value })} /></label><label>Abschnittskennung<input value={section.id} maxLength={96} onChange={e => update({ ...section, id: e.target.value })} /></label></div>
      <ol className="rf-layout-fields">{section.fieldKeys.map((key, i) => <li key={key}><span>{fields.find(f => f.localId === key)?.label ?? "Entferntes Feld"}</span><OrderButtons index={i} length={section.fieldKeys.length} onMove={delta => update({ ...section, fieldKeys: moveItem(section.fieldKeys, i, delta) })} /><Button variant="quiet" aria-label="Feld aus Abschnitt entfernen" onClick={() => update({ ...section, fieldKeys: section.fieldKeys.filter(k => k !== key) })}><Trash2 size={14} /></Button></li>)}</ol>
      <label>Feld zuordnen<select value="" onChange={e => { if (e.target.value) update({ ...section, fieldKeys: [...section.fieldKeys, e.target.value] }); }}><option value="">Feld auswählen …</option>{fields.filter(f => !section.fieldKeys.includes(f.localId)).map(f => <option key={f.localId} value={f.localId}>{f.label} ({f.id})</option>)}</select></label>
    </article>)}</>;
}

function ActionEditor({ draft, disabled, onChange }: { draft: RuleDraft; disabled: boolean; onChange(actions: DraftAction[]): void }) {
  const [selected, setSelected] = useState("");
  const action = draft.actions.find(a => a.localId === selected) ?? draft.actions[0];
  const update = (next: DraftAction) => onChange(draft.actions.map(a => a.localId === next.localId ? next : a));
  let expression = ""; if (action) { try { expression = draftExpression(action); } catch { expression = "Die Formel enthält noch unvollständige Bausteine."; } }
  return <><div className="rf-section-heading"><h3>Aktionen</h3><Button disabled={disabled || draft.actions.length >= RULE_LIMITS.actions} onClick={() => { const next = newAction(draft.actions.map(a => a.id)); onChange([...draft.actions, next]); setSelected(next.localId); }}><Plus size={15} />Aktion</Button></div>
    {action ? <><label>{disabled ? "Aktion ansehen" : "Aktion bearbeiten"}<select value={action.localId} onChange={e => setSelected(e.target.value)}>{draft.actions.map(a => <option key={a.localId} value={a.localId}>{a.name} ({a.id})</option>)}</select></label><fieldset className="rf-editor-fields" disabled={disabled}><div className="rf-section-heading"><h4>{action.name}</h4><span className="rf-toolbar"><OrderButtons index={draft.actions.indexOf(action)} length={draft.actions.length} onMove={delta => onChange(moveItem(draft.actions, draft.actions.indexOf(action), delta))} /><Button variant="quiet" onClick={() => onChange(draft.actions.filter(a => a.localId !== action.localId))}><Trash2 size={15} />Aktion entfernen</Button></span></div>
      <div className="rf-form-grid"><label>Name<input value={action.name} maxLength={120} onChange={e => update({ ...action, name: e.target.value })} /></label><label>Aktionskennung<input value={action.id} maxLength={96} onChange={e => update({ ...action, id: e.target.value })} /></label><label>Aktionsversion<input value={action.version} placeholder="1.0.0" onChange={e => update({ ...action, version: e.target.value })} /></label></div><label>Erklärung am Tisch<textarea rows={3} value={action.disclosure} maxLength={1024} onChange={e => update({ ...action, disclosure: e.target.value })} /><small>Erkläre insbesondere, wie das Wissen der handelnden Figur das Ergebnis beeinflusst.</small></label>
      <label className="rf-check"><input type="checkbox" checked={action.thresholdEnabled} onChange={e => update({ ...action, thresholdEnabled: e.target.checked })} />Feste Erfolgsschwelle verwenden</label>{action.thresholdEnabled ? <label>Erfolg ab Ergebnis<input type="number" value={action.threshold} step="any" onChange={e => update({ ...action, threshold: e.target.value })} /></label> : null}
      <details className="rf-input-editor"><summary>Eingaben der Aktion ({action.inputs.length})</summary><FieldList title="Aktionseingaben" fields={action.inputs} onChange={inputs => update({ ...action, inputs })} /></details>
      <FormulaBuilder value={action.formula} fields={{ actor: fieldTypes(draft.fields), input: fieldTypes(action.inputs) }} onChange={formula => update({ ...action, formula })} />
      <details><summary>Erzeugte Formel</summary><code className="rf-expression">{expression}</code></details><p className="rf-help">Am Tisch bleibt die menschliche Bestätigung für jede Aktion erforderlich.</p>
    </fieldset></> : <p>Lege die erste Aktion an. Ihr Ergebnis entsteht aus Würfeln, Feldern, Berechnungen und Wissen.</p>}</>;
}

function MigrationEditor({ draft, packages, onChange }: { draft: RuleDraft; packages: readonly RulePackage[]; onChange(migrations: DraftMigration[]): void }) {
  const sources = packages.filter(p => p.id === draft.id && p.version !== draft.version);
  const update = (next: DraftMigration) => onChange(draft.migrations.map(m => m.localId === next.localId ? next : m));
  return <><div className="rf-section-heading"><h3>Charakterfelder migrieren</h3><Button disabled={draft.migrations.length >= 64} onClick={() => onChange([...draft.migrations, { localId: localKey(), from: sources.find(p => !draft.migrations.some(m => m.from === p.version))?.version ?? "", steps: [] }])}><Plus size={15} />Migrationsweg</Button></div>
    <p>Jeder Weg beschreibt einen direkten Wechsel von einer früheren Version zu {draft.version || "dieser Version"}. Schritte werden der Reihe nach angewendet. Entfernte Werte müssen ausdrücklich archiviert und neue Felder ausdrücklich hinzugefügt werden.</p>
    <p className="rf-help">Bei vorhandenen Charakterbögen ist auch für unveränderte Felder ein Weg ohne Schritte erforderlich. Ein Wechsel zu einer anderen Paketkennung kann vorhandene Bögen nicht übernehmen. Bereits gespeicherte Würfe behalten ihre ursprünglichen Regeln.</p>
    <datalist id="rf-migration-versions">{sources.map(p => <option key={p.version} value={p.version} />)}</datalist>
    {draft.migrations.map(migration => <article className="rf-card" key={migration.localId}><div className="rf-section-heading"><h4>{migration.from || "Ausgangsversion wählen"} → {draft.version}</h4><Button variant="quiet" aria-label={`Migrationsweg von ${migration.from} entfernen`} onClick={() => onChange(draft.migrations.filter(m => m.localId !== migration.localId))}><Trash2 size={15} /></Button></div><label>Ausgangsversion<input value={migration.from} list="rf-migration-versions" placeholder="1.0.0" onChange={e => update({ ...migration, from: e.target.value })} /></label>
      {sources.find(p => p.version === migration.from) ? <p className="rf-help">Ausgangsfelder: {Object.keys(sources.find(p => p.version === migration.from)!.fields).join(", ") || "keine"}. Zielfelder: {draft.fields.map(f => f.id).join(", ") || "keine"}.</p> : <p className="rf-help">Diese Ausgangsversion ist noch nicht in der Bibliothek. Die tatsächlichen Charakterwerte prüft die Aktivierungsvorschau.</p>}
      {!migration.steps.length ? <p>Keine Feldänderungen. Vorhandene Werte bleiben erhalten, sofern sie vollständig zum Zielbogen passen.</p> : null}
      {migration.steps.map((step, index) => <MigrationStepEditor key={step.localId} step={step} index={index} length={migration.steps.length} onChange={next => update({ ...migration, steps: migration.steps.map(s => s.localId === step.localId ? next : s) })} onRemove={() => update({ ...migration, steps: migration.steps.filter(s => s.localId !== step.localId) })} onMove={delta => update({ ...migration, steps: moveItem(migration.steps, index, delta) })} />)}
      <div className="rf-toolbar">{(["rename", "add", "archive", "numeric"] as const).map(kind => <Button key={kind} disabled={migration.steps.length >= 128} onClick={() => update({ ...migration, steps: [...migration.steps, migrationStepDraft(kind === "rename" ? { kind, from: "", to: "" } : kind === "add" ? { kind, field: "", value: 0 } : kind === "archive" ? { kind, field: "" } : { kind, field: "", expression: "actor.value" })] })}><Plus size={14} />{kind === "rename" ? "Umbenennen" : kind === "add" ? "Hinzufügen" : kind === "archive" ? "Archivieren" : "Zahl umrechnen"}</Button>)}</div>
    </article>)}</>;
}
function MigrationStepEditor({ step, index, length, onChange, onRemove, onMove }: { step: DraftMigrationStep; index: number; length: number; onChange(step: DraftMigrationStep): void; onRemove(): void; onMove(delta: -1 | 1): void }) {
  return <fieldset className="rf-migration-step"><legend>{index + 1}. {step.kind === "rename" ? "Umbenennen" : step.kind === "add" ? "Hinzufügen" : step.kind === "archive" ? "Archivieren" : "Zahl umrechnen"}</legend><div className="rf-toolbar"><OrderButtons index={index} length={length} onMove={onMove} /><Button variant="quiet" onClick={onRemove} aria-label={`Migrationsschritt ${index + 1} entfernen`}><Trash2 size={15} /></Button></div>
    {step.kind === "rename" ? <div className="rf-form-grid"><label>Bisherige Feldkennung<input value={step.from} onChange={e => onChange({ ...step, from: e.target.value })} /></label><label>Neue Feldkennung<input value={step.to} onChange={e => onChange({ ...step, to: e.target.value })} /></label></div> : <label>Feldkennung<input value={step.field} onChange={e => onChange({ ...step, field: e.target.value })} /></label>}
    {step.kind === "add" ? <div className="rf-form-grid"><label>Werttyp<select value={step.type} onChange={e => { const type = e.target.value as FormulaType; onChange({ ...step, type, value: type === "number" ? "0" : type === "boolean" ? "false" : "" }); }}><option value="number">Zahl</option><option value="string">Text</option><option value="boolean">Wahr / falsch</option></select></label><label>Wert für bestehende Charaktere{step.type === "boolean" ? <select value={step.value} onChange={e => onChange({ ...step, value: e.target.value })}><option value="false">Falsch</option><option value="true">Wahr</option></select> : <input type={step.type === "number" ? "number" : "text"} step="any" value={step.value} onChange={e => onChange({ ...step, value: e.target.value })} />}</label></div> : null}
    {step.kind === "numeric" ? <><p className="rf-help">Das Charakterfeld „value“ bezeichnet den bisherigen Zahlenwert dieses Feldes.</p><FormulaBuilder label="Neuer Zahlenwert" value={step.formula} fields={{ actor: { value: "number" }, input: {} }} allowDice={false} allowKnowledge={false} onChange={formula => onChange({ ...step, formula })} /></> : null}
  </fieldset>;
}

function ReviewPanel({ review, acknowledged, onAcknowledge, disabled }: { review: RuleReview; acknowledged: boolean; onAcknowledge(value: boolean): void; disabled: boolean }) {
  return <section className="rf-review" aria-label="Geprüfte Aktivierung"><h4>Vorschau: {review.from.version} → {review.to.version}</h4><p>{review.from.id} → {review.to.id}</p>
    {review.migration ? <><p>{review.migration.entities.length} vorhandene Charakterbögen geprüft.</p>{review.migration.entities.map(entity => <details key={entity.id}><summary>Charakter {entity.id} · {entity.changes.length} Änderungen</summary><div className="rf-table-scroll"><table><caption>Geprüfte Feldwerte</caption><thead><tr><th>Feld</th><th>Vorher</th><th>Nachher</th><th>Archiviert</th></tr></thead><tbody>{[...new Set([...Object.keys(entity.before), ...Object.keys(entity.after), ...Object.keys(entity.archived)])].map(field => <tr key={field}><th>{field}</th><td>{Object.hasOwn(entity.before, field) ? String(entity.before[field]) : "—"}</td><td>{Object.hasOwn(entity.after, field) ? String(entity.after[field]) : "—"}</td><td>{Object.hasOwn(entity.archived, field) ? String(entity.archived[field]) : "—"}</td></tr>)}</tbody></table></div>{entity.changes.length ? <ul>{entity.changes.map((change, i) => <li key={i}>{change}</li>)}</ul> : <p>Keine Feldänderungen.</p>}</details>)}
      {review.migration.entities.length ? <label className="rf-check"><input type="checkbox" checked={acknowledged} disabled={disabled} onChange={e => onAcknowledge(e.target.checked)} />Ich habe die Feldänderungen und archivierten Werte geprüft.</label> : null}</> : <p>Für diese Aktivierung müssen keine vorhandenen Charakterbögen migriert werden.</p>}
    <p className="rf-help">Ändern sich Paket, aktive Version oder Charakterwerte, ist vor der Aktivierung eine neue Vorschau erforderlich.</p>
  </section>;
}
