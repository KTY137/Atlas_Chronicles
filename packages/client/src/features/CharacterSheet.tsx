// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HostRuleFields } from "./HostRuleFields";
import { useHostRules } from "./useHostRules";
import { Geldzaehler } from "./Geldzaehler";
import { CHRONICLE_ARCHETYPES, CHRONICLE_EXAMPLE_CHARACTERS, CHRONICLE_FUNKEN_FIELD, type Scalar } from "@chronicle/rules";
import { CharacterPortrait } from "./CharacterPortrait";
import { PenLine, Save, Sparkles } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { locale, t } from "../i18n";
import type { ActorSheet, RulesState } from "./game-api";
import { hasChronicleExamples, hasChronicleGuidance, RuleAttribution } from "./RuleComputedFields";
import { displayChronicleExample } from "./chronicle-heroes-display";

export function CharacterSheet({ campaignId, actorId, rules, onDirty, gm, onChanged, liveRevision = 0 }: { campaignId: string; actorId: string; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onChanged: () => void; liveRevision?: number }) {
  const [revision, setRevision] = useState(0), sheet = useResource<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`), revision + liveRevision);
  const [drafts, setDrafts] = useState({ sheet: false, money: false, portrait: false });
  const reportSheet = useCallback((value: boolean) => setDrafts(old => ({ ...old, sheet: value })), []);
  const reportMoney = useCallback((value: boolean) => setDrafts(old => ({ ...old, money: value })), []);
  const reportPortrait = useCallback((value: boolean) => setDrafts(old => ({ ...old, portrait: value })), []);
  const dirty = drafts.sheet || drafts.money || drafts.portrait;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const refresh = () => { setRevision(value => value + 1); onChanged(); };
  // Der Geldzaehler steht auch hier: "im Inventar, aber noch beim Char". Dieselbe Komponente
  // wie im Inventar — zweimal geschrieben liefe sie beim ersten Umbau auseinander.
  return sheet.loading ? <Loading /> : <>{sheet.error ? <Notice error>{sheet.error} {t("Der letzte geladene Stand bleibt bei einem Verbindungsfehler erhalten.")}</Notice> : null}{sheet.data ? <><CharacterPortrait key={`portrait:${actorId}`} campaignId={campaignId} actorId={actorId} revision={revision + liveRevision} onDirty={reportPortrait} onChanged={refresh} /><SheetForm key={actorId} campaignId={campaignId} latest={sheet.data} rules={rules} onDirty={reportSheet} gm={gm} onSaved={refresh} /></> : null}<Geldzaehler campaignId={campaignId} actorId={actorId} gm={gm} revision={revision + liveRevision} kompakt onDirty={reportMoney} onChanged={refresh} /></>;
}

function SheetForm({ campaignId, latest, rules, onDirty, gm, onSaved }: { campaignId: string; latest: ActorSheet; rules: RulesState; onDirty: (value: boolean) => void; gm: boolean; onSaved: () => void }) {
  const [sheet, setSheet] = useState(latest);
  const [fields, setFields] = useState<Record<string, Scalar>>({ ...sheet.fields }), task = useTask();
  const [resource, setResource] = useState(""), [delta, setDelta] = useState(-1), [archetyp, setArchetyp] = useState("");
  const fieldsRef = useRef<HTMLDivElement>(null);
  const pkg = rules.packages.find(pkg => pkg.id === sheet.packageId && pkg.version === sheet.packageVersion);
  const editor = useHostRules(campaignId, { id: sheet.packageId, version: sheet.packageVersion }, fields);
  const examplesAvailable = useMemo(() => !!pkg && hasChronicleExamples(pkg), [pkg]);
  const computed: Readonly<Record<string, number>> = editor.preview?.valid ? editor.preview.computed : {};
  const dirty = JSON.stringify(fields) !== JSON.stringify(sheet.fields);
  const newer = latest.version > sheet.version || (latest.version === sheet.version && (latest.packageId !== sheet.packageId || latest.packageVersion !== sheet.packageVersion));
  useEffect(() => { if (!dirty && newer) { setSheet(latest); setFields({ ...latest.fields }); setResource(""); setArchetyp(""); } }, [dirty, newer, latest]);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  const runtime = editor.manifest;
  // "Wer bin ich" zuerst: der eigene Figurenname (falls das Regelpaket einen kennt) führt den Bogen an, nicht der Paketname.
  const characterName = runtime?.fields.name?.type === "string" && typeof fields.name === "string" ? fields.name.trim() : "";
  const saveState = dirty ? t("Ungespeicherte Änderungen.") : sheet.version === 0 ? t("Noch nicht gespeichert.") : t("Gespeichert.");
  const canOfferExamples = !!pkg && hasChronicleGuidance(pkg) && examplesAvailable;
  const emptyStateAction = canOfferExamples
    ? <><div className="button-row">{CHRONICLE_EXAMPLE_CHARACTERS.map(displayChronicleExample).map(example => <Button key={example.id} disabled={task.busy} onClick={() => { if (!dirty || window.confirm(t("Die aktuellen Entwurfswerte durch diese Beispielperson ersetzen?"))) setFields(Object.fromEntries(Object.entries(pkg!.fields).map(([id, field]) => [id, example.fields[id] ?? field.default]))); }}><Sparkles size={16} /> {t("{name} als Beispiel übernehmen", { name: example.name })}</Button>)}</div>
      {/* Archetypen sind fertige Startbögen mit drei Fähigkeiten — derselbe Weg wie die Beispielpersonen. */}
      <div className="button-row"><label>{t("Archetyp")}<select value={archetyp} disabled={task.busy} onChange={event => setArchetyp(event.target.value)}><option value="">{t("Archetyp wählen")}</option>{CHRONICLE_ARCHETYPES.map(displayChronicleExample).map(vorlage => <option key={vorlage.id} value={vorlage.id}>{vorlage.name} · {vorlage.description}</option>)}</select></label>
        <Button disabled={task.busy || !archetyp} onClick={() => { const vorlage = CHRONICLE_ARCHETYPES.map(displayChronicleExample).find(kandidat => kandidat.id === archetyp); if (vorlage && (!dirty || window.confirm(t("Die aktuellen Entwurfswerte durch diesen Archetyp ersetzen?")))) setFields(Object.fromEntries(Object.entries(pkg!.fields).map(([id, field]) => [id, vorlage.fields[id] ?? field.default]))); }}><Sparkles size={16} /> {t("Archetyp übernehmen")}</Button></div></>
    : <Button variant="primary" disabled={task.busy} onClick={() => fieldsRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus()}><PenLine size={16} /> {t("Werte jetzt eintragen")}</Button>;
  const emptyStateBody = canOfferExamples
    ? t("Noch gelten überall die Vorgabewerte des Regelwerks. Übernimm eine vorbereitete Beispielperson als Startpunkt oder trag weiter unten deine eigenen Werte ein.")
    : pkg && hasChronicleGuidance(pkg) ? t("Noch gelten überall die Vorgabewerte des Regelwerks. Diese Runde verwendet einen angepassten Katalog. Verteile deine Startpunkte selbst; die fertigen Beispielfiguren passen zum unveränderten Beispielkatalog.")
    : t("Noch gelten überall die Vorgabewerte des Regelwerks. Trag weiter unten deine eigenen Werte ein und speichere danach den Bogen.");
  return <div className="sheet-content"><form className="panel" onSubmit={(event) => { event.preventDefault(); if (!editor.canSave || !runtime) return; void task.run(async () => { const saved = await api<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/sheet`), { method: "PUT", body: { fields: editor.preview!.fields, expectedVersion: sheet.version, packageContentHash: runtime.contentHash } }); setSheet(saved); setFields({ ...saved.fields }); onDirty(false); onSaved(); }); }}>
    <div className="section-heading"><div><p className="eyebrow">{runtime?.name ?? pkg?.name ?? sheet.packageId} · {sheet.packageVersion}</p><h2>{characterName || t("Dein Charakterbogen")}</h2></div><Button type="submit" variant="primary" disabled={task.busy || !editor.canSave}><Save size={16} /> {t("Bogen speichern")}</Button></div>
    <p className="field-help" role="status">{saveState}</p>
    {task.error ? <Notice error>{task.error} {t("Deine Änderungen bleiben im Formular.")}</Notice> : null}
    {newer && dirty ? <Notice>{t("Der Bogen wurde inzwischen geändert. Dein Entwurf bleibt erhalten.")} <Button onClick={() => { if (window.confirm(t("Entwurf verwerfen und den aktuellen Bogen übernehmen?"))) { setSheet(latest); setFields({ ...latest.fields }); setResource(""); task.setError(""); } }}>{t("Aktuellen Bogen übernehmen")}</Button></Notice> : null}
    {sheet.defeatPending ? <Notice>{t("Eine Ressource ist aufgebraucht. Die Niederlage wartet auf eine ausdrückliche Bestätigung der Spielleitung.")}</Notice> : null}{sheet.defeatedAt ? <Notice>{t("Niederlage bestätigt am {zeitpunkt}.", { zeitpunkt: new Date(sheet.defeatedAt).toLocaleString(locale()) })}</Notice> : null}
    {sheet.version === 0 ? <EmptyState title={characterName ? t("{name}: Der Bogen wartet auf seine Werte.", { name: characterName }) : t("Dieser Bogen wartet auf seine Werte.")} action={emptyStateAction}>{emptyStateBody}</EmptyState> : null}
    <p className="field-help">{t("Die folgenden Werte kannst du bearbeiten. Das Regelwerk prüft jede Eingabe automatisch.")}</p>
    <div ref={fieldsRef}><HostRuleFields state={editor} source={pkg} onChange={next => setFields(current => ({ ...current, ...next }))} disabled={task.busy} /></div>
    {pkg && hasChronicleGuidance(pkg) ? <section aria-label={t("Funken verwalten")}><h3>{t("Funken")}</h3><p>{t("Bei einer misslungenen, nicht kritisch misslungenen Probe kannst du einen Funken ausgeben und erneut würfeln. Speichere die Ausgabe zuerst im Bogen und würfle danach am Tisch ausdrücklich erneut. Der erste Beleg bleibt erhalten.")}</p>
      {(() => { const field = CHRONICLE_FUNKEN_FIELD, spent = fields[field], remaining = computed["funken_remaining"]; return typeof spent === "number" && pkg.fields[field]?.type === "integer" ? <div className="button-row"><Button disabled={task.busy || !(typeof remaining === "number" && remaining > 0)} onClick={() => setFields(current => ({ ...current, [field]: spent + 1 }))}>{t("Funken einsetzen")}</Button><Button disabled={task.busy || spent === 0} onClick={() => setFields(current => ({ ...current, [field]: 0 }))}>{t("Vorrat auffüllen")}</Button></div> : null; })()}
      <p className="field-help">{t("Diese Knöpfe ändern deinen Entwurf. „Bogen speichern“ übernimmt die Ausgabe oder das vereinbarte Auffüllen.")}</p>
    </section> : null}
    {pkg ? <RuleAttribution pkg={pkg} /> : null}
  </form>{gm && pkg?.schemaVersion === 1 ? <form className="panel resource-adjustment" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { await api(apiPath(campaignId, `/actors/${encodeURIComponent(sheet.actorId)}/resource`), { method: "POST", body: { field: resource, delta, expectedVersion: sheet.version } }); onSaved(); }); }}><h2>{t("Ressource verändern")}</h2><p className="field-help">{t("Der Server prüft Wertebereich, Revision und einen möglichen Niederlagenzustand.")}</p><div className="rule-fields"><label>{t("Ressource")}<select value={resource} onChange={(e) => setResource(e.target.value)} required><option value="">{t("Bitte wählen")}</option>{Object.entries(pkg!.fields).filter(([, field]) => field.type === "integer" || field.type === "number").map(([id, field]) => <option value={id} key={id}>{field.label}</option>)}</select></label><label>{t("Änderung")}<input type="number" value={delta} onChange={(e) => setDelta(e.target.valueAsNumber)} required /></label></div><Button type="submit" disabled={task.busy || dirty || !resource}>{t("Änderung anwenden")}</Button>{dirty ? <p className="field-help">{t("Speichere zuerst die Änderungen am Bogen.")}</p> : null}</form> : null}</div>;
}
