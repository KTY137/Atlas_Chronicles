// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vitalanzeige } from "./Vitalanzeige";
import { Geldzaehler } from "./Geldzaehler";
import { validatePackageFields, evaluateComputedFields, HTBAH_GROUPS, HTBAH_GROUP_LABELS, HTBAH_EXAMPLE_CHARACTERS, htbahSpentField, type Scalar } from "@chronicle/rules";
import { PenLine, Save, Sparkles } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import type { ActorSheet, RulesState } from "./game-api";
import { RuleFields } from "./RuleFields";
import { hasHtbahExamples, hasHtbahGuidance, RuleAttribution, RuleComputedFields } from "./RuleComputedFields";

export function CharacterSheet({ campaignId, actorId, rules, onDirty, gm, onChanged, liveRevision = 0 }: { campaignId: string; actorId: string; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onChanged: () => void; liveRevision?: number }) {
  const [revision, setRevision] = useState(0), sheet = useResource<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`), revision + liveRevision);
  const [drafts, setDrafts] = useState({ sheet: false, money: false });
  const reportSheet = useCallback((value: boolean) => setDrafts(old => ({ ...old, sheet: value })), []);
  const reportMoney = useCallback((value: boolean) => setDrafts(old => ({ ...old, money: value })), []);
  const dirty = drafts.sheet || drafts.money;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const refresh = () => { setRevision(value => value + 1); onChanged(); };
  // Der Geldzaehler steht auch hier: "im Inventar, aber noch beim Char". Dieselbe Komponente
  // wie im Inventar — zweimal geschrieben liefe sie beim ersten Umbau auseinander.
  return sheet.loading ? <Loading /> : <>{sheet.error ? <Notice error>{sheet.error} Der letzte geladene Stand bleibt bei einem Verbindungsfehler erhalten.</Notice> : null}<Geldzaehler campaignId={campaignId} actorId={actorId} gm={gm} revision={revision + liveRevision} kompakt onDirty={reportMoney} onChanged={refresh} />{sheet.data ? <SheetForm key={actorId} campaignId={campaignId} latest={sheet.data} rules={rules} onDirty={reportSheet} gm={gm} onSaved={refresh} /> : null}</>;
}

function SheetForm({ campaignId, latest, rules, onDirty, gm, onSaved }: { campaignId: string; latest: ActorSheet; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onSaved: () => void }) {
  const [sheet, setSheet] = useState(latest);
  const [fields, setFields] = useState<Record<string, Scalar>>({ ...sheet.fields }), task = useTask();
  const [resource, setResource] = useState(""), [delta, setDelta] = useState(-1);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const pkg = rules.packages.find(pkg => pkg.id === sheet.packageId && pkg.version === sheet.packageVersion);
  const examplesAvailable = useMemo(() => !!pkg && hasHtbahExamples(pkg), [pkg]);
  const validation = useMemo(() => { try { if (pkg) validatePackageFields(pkg, fields); return ""; } catch (error) { return error instanceof Error ? error.message : "Die Bogenwerte sind noch nicht gültig."; } }, [pkg, fields]);
  const computed = useMemo(() => { try { return pkg ? evaluateComputedFields(pkg, fields) : {}; } catch { return {}; } }, [pkg, fields]);
  const dirty = JSON.stringify(fields) !== JSON.stringify(sheet.fields);
  const newer = latest.version > sheet.version || (latest.version === sheet.version && (latest.packageId !== sheet.packageId || latest.packageVersion !== sheet.packageVersion));
  useEffect(() => { if (!dirty && newer) { setSheet(latest); setFields({ ...latest.fields }); setResource(""); } }, [dirty, newer, latest]);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  if (!pkg) return <Notice error>Das Regelwerk dieses Bogens konnte nicht geladen werden.</Notice>;
  // "Wer bin ich" zuerst: der eigene Figurenname (falls das Regelpaket einen kennt) führt den Bogen an, nicht der Paketname.
  const characterName = pkg.fields.name?.type === "string" && typeof fields.name === "string" ? fields.name.trim() : "";
  const saveState = dirty ? "Ungespeicherte Änderungen." : sheet.version === 0 ? "Noch nicht gespeichert." : "Gespeichert.";
  const canOfferExamples = hasHtbahGuidance(pkg) && examplesAvailable;
  const emptyStateAction = canOfferExamples
    ? <div className="button-row">{HTBAH_EXAMPLE_CHARACTERS.map(example => <Button key={example.id} disabled={task.busy} onClick={() => { if (!dirty || window.confirm("Die aktuellen Entwurfswerte durch diese Beispielperson ersetzen?")) setFields(Object.fromEntries(Object.entries(pkg.fields).map(([id, field]) => [id, example.fields[id] ?? field.default]))); }}><Sparkles size={16} /> {example.name} als Beispiel übernehmen</Button>)}</div>
    : <Button variant="primary" disabled={task.busy} onClick={() => fieldsRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus()}><PenLine size={16} /> Werte jetzt eintragen</Button>;
  const emptyStateBody = canOfferExamples
    ? "Noch gelten überall die Vorgabewerte des Regelwerks. Übernimm eine vorbereitete Beispielperson als Startpunkt oder trag weiter unten deine eigenen Werte ein."
    : hasHtbahGuidance(pkg) ? "Noch gelten überall die Vorgabewerte des Regelwerks. Diese Runde verwendet einen angepassten Katalog. Verteile deine Startpunkte selbst; die fertigen Beispielfiguren passen zum unveränderten Beispielkatalog."
    : "Noch gelten überall die Vorgabewerte des Regelwerks. Trag weiter unten deine eigenen Werte ein und speichere danach den Bogen.";
  return <div className="sheet-content"><form className="panel" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { const saved = await api<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/sheet`), { method: "PUT", body: { fields, expectedVersion: sheet.version } }); setSheet(saved); setFields({ ...saved.fields }); onDirty(false); onSaved(); }); }}>
    <div className="section-heading"><div><p className="eyebrow">{pkg.name} · {pkg.version}</p><h2>{characterName || "Dein Charakterbogen"}</h2></div><Button type="submit" variant="primary" disabled={task.busy || !!validation}><Save size={16} /> Bogen speichern</Button></div>
    <p className="field-help" role="status">{saveState}</p>
    {/* Die Balken lesen den ENTWURF, nicht den gespeicherten Stand: wer Lebenspunkte
        eintraegt, sieht den Balken wandern, bevor er speichert. Gerechnet wird mit
        derselben reinen Funktion wie auf dem Server. */}
    <Vitalanzeige pkg={pkg} fields={fields} />
    {task.error ? <Notice error>{task.error} Deine Änderungen bleiben im Formular.</Notice> : null}
    {newer && dirty ? <Notice>Der Bogen wurde inzwischen geändert. Dein Entwurf bleibt erhalten. <Button onClick={() => { if (window.confirm("Entwurf verwerfen und den aktuellen Bogen übernehmen?")) { setSheet(latest); setFields({ ...latest.fields }); setResource(""); task.setError(""); } }}>Aktuellen Bogen übernehmen</Button></Notice> : null}
    {sheet.defeatPending ? <Notice>Eine Ressource ist aufgebraucht. Die Niederlage wartet auf eine ausdrückliche Bestätigung der Spielleitung.</Notice> : null}{sheet.defeatedAt ? <Notice>Niederlage bestätigt am {new Date(sheet.defeatedAt).toLocaleString("de-DE")}.</Notice> : null}
    {sheet.version === 0 ? <EmptyState title={characterName ? `${characterName}: Der Bogen wartet auf seine Werte.` : "Dieser Bogen wartet auf seine Werte."} action={emptyStateAction}>{emptyStateBody}</EmptyState> : null}
    <p className="field-help">Die folgenden Werte kannst du bearbeiten. Das Regelwerk prüft jede Eingabe automatisch.</p>
    <div ref={fieldsRef}>{pkg.layout.sections.map((section) => <fieldset className="sheet-section" key={section.id}><legend>{section.label}</legend><RuleFields fields={Object.fromEntries(section.fields.map((id) => [id, pkg.fields[id]]))} values={fields} onChange={(next) => setFields((current) => ({ ...current, ...next }))} disabled={task.busy} /></fieldset>)}</div>
    {pkg.schemaVersion === 2 ? <p className="field-help">Automatisch berechnet nach den Regeln von {pkg.name} · {pkg.version}. Diese Werte trägst du nicht selbst ein.</p> : null}
    <RuleComputedFields pkg={pkg} fields={fields} />{validation && pkg.schemaVersion === 1 ? <Notice error>{validation}</Notice> : null}
    {hasHtbahGuidance(pkg) ? <section aria-label="Geistesblitze verwalten"><h3>Geistesblitze</h3><p>Bei einer misslungenen, nicht kritisch misslungenen Probe kannst du einen Punkt derselben Begabung ausgeben. Speichere die Ausgabe zuerst im Bogen und würfle danach am Tisch ausdrücklich erneut. Der erste Beleg bleibt erhalten.</p>
      {HTBAH_GROUPS.map(group => { const field = htbahSpentField(group), spent = fields[field], remaining = computed[`gbp_remaining_${group}`]; return typeof spent === "number" && pkg.fields[field]?.type === "integer" ? <div className="button-row" key={group}><Button disabled={task.busy || !(typeof remaining === "number" && remaining > 0)} onClick={() => setFields(current => ({ ...current, [field]: spent + 1 }))}>Geistesblitz einsetzen · {HTBAH_GROUP_LABELS[group]}</Button><Button disabled={task.busy || spent === 0} onClick={() => setFields(current => ({ ...current, [field]: 0 }))}>Vorrat auffüllen · {HTBAH_GROUP_LABELS[group]}</Button></div> : null; })}
      <p className="field-help">Diese Knöpfe ändern deinen Entwurf. „Bogen speichern“ übernimmt die Ausgabe oder das vereinbarte Auffüllen.</p>
    </section> : null}
    <RuleAttribution pkg={pkg} />
  </form>{gm && pkg.schemaVersion === 1 ? <form className="panel resource-adjustment" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { await api(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/resource`), { method: "POST", body: { field: resource, delta, expectedVersion: sheet.version } }); onSaved(); }); }}><h2>Ressource verändern</h2><p className="field-help">Der Server prüft Wertebereich, Revision und einen möglichen Niederlagenzustand.</p><div className="rule-fields"><label>Ressource<select value={resource} onChange={(e) => setResource(e.target.value)} required><option value="">Bitte wählen</option>{Object.entries(pkg.fields).filter(([, field]) => field.type === "integer" || field.type === "number").map(([id, field]) => <option value={id} key={id}>{field.label}</option>)}</select></label><label>Änderung<input type="number" value={delta} onChange={(e) => setDelta(e.target.valueAsNumber)} required /></label></div><Button type="submit" disabled={task.busy || dirty || !resource}>Änderung anwenden</Button>{dirty ? <p className="field-help">Speichere zuerst die Änderungen am Bogen.</p> : null}</form> : null}</div>;
}
