import { useEffect, useState } from "react";
import type { RulePackage, Scalar } from "@chronicle/rules";
import { Save } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import type { ActorSheet, RulesState } from "./game-api";
import { RuleFields } from "./RuleFields";

export function CharacterSheet({ campaignId, actorId, rules, onDirty, gm, onChanged }: { campaignId: string; actorId: string; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onChanged: () => void }) {
  const [revision, setRevision] = useState(0), sheet = useResource<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`), revision);
  const pkg = rules.packages.find((pkg) => pkg.id === sheet.data?.packageId && pkg.version === sheet.data.packageVersion);
  return sheet.loading ? <Loading /> : sheet.error ? <Notice error>{sheet.error}</Notice> : sheet.data && pkg ? <SheetForm key={`${actorId}-${sheet.data.version}`} campaignId={campaignId} sheet={sheet.data} pkg={pkg} onDirty={onDirty} gm={gm} onSaved={() => { setRevision((v) => v + 1); onChanged(); }} /> : <Notice error>Das Regelwerk dieses Bogens konnte nicht geladen werden.</Notice>;
}

function SheetForm({ campaignId, sheet, pkg, onDirty, gm, onSaved }: { campaignId: string; sheet: ActorSheet; pkg: RulePackage; onDirty: (value: boolean) => void; gm: boolean; onSaved: () => void }) {
  const [fields, setFields] = useState<Record<string, Scalar>>({ ...sheet.fields }), task = useTask();
  const [resource, setResource] = useState(""), [delta, setDelta] = useState(-1);
  const dirty = JSON.stringify(fields) !== JSON.stringify(sheet.fields);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  return <div className="sheet-content"><form className="panel" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { await api(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/sheet`), { method: "PUT", body: { fields, expectedVersion: sheet.version } }); onDirty(false); onSaved(); }); }}>
    <div className="section-heading"><div><p className="eyebrow">{pkg.name} · {pkg.version}</p><h2>Dein Charakterbogen</h2></div><Button type="submit" variant="primary" disabled={task.busy}><Save size={16} /> Bogen speichern</Button></div>
    {task.error ? <Notice error>{task.error} Deine Änderungen bleiben im Formular.</Notice> : null}
    {sheet.defeatPending ? <Notice>Eine Ressource ist aufgebraucht. Die Niederlage wartet auf eine ausdrückliche Bestätigung der Spielleitung.</Notice> : null}{sheet.defeatedAt ? <Notice>Niederlage bestätigt am {new Date(sheet.defeatedAt).toLocaleString("de-DE")}.</Notice> : null}
    {pkg.layout.sections.map((section) => <fieldset className="sheet-section" key={section.id}><legend>{section.label}</legend><RuleFields fields={Object.fromEntries(section.fields.map((id) => [id, pkg.fields[id]]))} values={fields} onChange={(next) => setFields((current) => ({ ...current, ...next }))} disabled={task.busy} /></fieldset>)}
  </form>{gm ? <form className="panel resource-adjustment" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { await api(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/resource`), { method: "POST", body: { field: resource, delta, expectedVersion: sheet.version } }); onSaved(); }); }}><h2>Ressource verändern</h2><p className="field-help">Der Server prüft Wertebereich, Revision und einen möglichen Niederlagenzustand.</p><div className="rule-fields"><label>Ressource<select value={resource} onChange={(e) => setResource(e.target.value)} required><option value="">Bitte wählen</option>{Object.entries(pkg.fields).filter(([, field]) => field.type === "integer" || field.type === "number").map(([id, field]) => <option value={id} key={id}>{field.label}</option>)}</select></label><label>Änderung<input type="number" value={delta} onChange={(e) => setDelta(e.target.valueAsNumber)} required /></label></div><Button disabled={task.busy || dirty || !resource}>Änderung anwenden</Button>{dirty ? <p className="field-help">Speichere zuerst die Änderungen am Bogen.</p> : null}</form> : null}</div>;
}
