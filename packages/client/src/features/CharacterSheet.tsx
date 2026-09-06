import { useEffect, useState } from "react";
import type { RulePackage, Scalar } from "@chronicle/rules";
import { Save } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import type { ActorSheet, RulesState } from "./game-api";
import { RuleFields } from "./RuleFields";

export function CharacterSheet({ campaignId, actorId, rules, onDirty, gm, onChanged, liveRevision = 0 }: { campaignId: string; actorId: string; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onChanged: () => void; liveRevision?: number }) {
  const [revision, setRevision] = useState(0), sheet = useResource<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`), revision + liveRevision);
  return sheet.loading ? <Loading /> : <>{sheet.error ? <Notice error>{sheet.error} Der letzte geladene Stand bleibt bei einem Verbindungsfehler erhalten.</Notice> : null}{sheet.data ? <SheetForm key={actorId} campaignId={campaignId} latest={sheet.data} rules={rules} onDirty={onDirty} gm={gm} onSaved={() => { setRevision((v) => v + 1); onChanged(); }} /> : null}</>;
}

function SheetForm({ campaignId, latest, rules, onDirty, gm, onSaved }: { campaignId: string; latest: ActorSheet; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onSaved: () => void }) {
  const [sheet, setSheet] = useState(latest);
  const [fields, setFields] = useState<Record<string, Scalar>>({ ...sheet.fields }), task = useTask();
  const [resource, setResource] = useState(""), [delta, setDelta] = useState(-1);
  const pkg = rules.packages.find(pkg => pkg.id === sheet.packageId && pkg.version === sheet.packageVersion);
  const dirty = JSON.stringify(fields) !== JSON.stringify(sheet.fields);
  const newer = latest.version > sheet.version || (latest.version === sheet.version && (latest.packageId !== sheet.packageId || latest.packageVersion !== sheet.packageVersion));
  useEffect(() => { if (!dirty && newer) { setSheet(latest); setFields({ ...latest.fields }); setResource(""); } }, [dirty, newer, latest]);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  if (!pkg) return <Notice error>Das Regelwerk dieses Bogens konnte nicht geladen werden.</Notice>;
  return <div className="sheet-content"><form className="panel" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { const saved = await api<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/sheet`), { method: "PUT", body: { fields, expectedVersion: sheet.version } }); setSheet(saved); setFields({ ...saved.fields }); onDirty(false); onSaved(); }); }}>
    <div className="section-heading"><div><p className="eyebrow">{pkg.name} · {pkg.version}</p><h2>Dein Charakterbogen</h2></div><Button type="submit" variant="primary" disabled={task.busy}><Save size={16} /> Bogen speichern</Button></div>
    {task.error ? <Notice error>{task.error} Deine Änderungen bleiben im Formular.</Notice> : null}
    {newer && dirty ? <Notice>Der Bogen wurde inzwischen geändert. Dein Entwurf bleibt erhalten. <Button onClick={() => { if (window.confirm("Entwurf verwerfen und den aktuellen Bogen übernehmen?")) { setSheet(latest); setFields({ ...latest.fields }); setResource(""); task.setError(""); } }}>Aktuellen Bogen übernehmen</Button></Notice> : null}
    {sheet.defeatPending ? <Notice>Eine Ressource ist aufgebraucht. Die Niederlage wartet auf eine ausdrückliche Bestätigung der Spielleitung.</Notice> : null}{sheet.defeatedAt ? <Notice>Niederlage bestätigt am {new Date(sheet.defeatedAt).toLocaleString("de-DE")}.</Notice> : null}
    {pkg.layout.sections.map((section) => <fieldset className="sheet-section" key={section.id}><legend>{section.label}</legend><RuleFields fields={Object.fromEntries(section.fields.map((id) => [id, pkg.fields[id]]))} values={fields} onChange={(next) => setFields((current) => ({ ...current, ...next }))} disabled={task.busy} /></fieldset>)}
  </form>{gm ? <form className="panel resource-adjustment" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { await api(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/resource`), { method: "POST", body: { field: resource, delta, expectedVersion: sheet.version } }); onSaved(); }); }}><h2>Ressource verändern</h2><p className="field-help">Der Server prüft Wertebereich, Revision und einen möglichen Niederlagenzustand.</p><div className="rule-fields"><label>Ressource<select value={resource} onChange={(e) => setResource(e.target.value)} required><option value="">Bitte wählen</option>{Object.entries(pkg.fields).filter(([, field]) => field.type === "integer" || field.type === "number").map(([id, field]) => <option value={id} key={id}>{field.label}</option>)}</select></label><label>Änderung<input type="number" value={delta} onChange={(e) => setDelta(e.target.valueAsNumber)} required /></label></div><Button type="submit" disabled={task.busy || dirty || !resource}>Änderung anwenden</Button>{dirty ? <p className="field-help">Speichere zuerst die Änderungen am Bogen.</p> : null}</form> : null}</div>;
}
