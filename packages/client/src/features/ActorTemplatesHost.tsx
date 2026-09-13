// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorKindValue, ActorTemplateData, Beutezeile, FigurantragFreigabeAck, FigurvorlageFreigabeStand, ItemContract, TemplateCard } from "@chronicle/protocol";
import type { Scalar } from "@chronicle/rules";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, type EntrySummary } from "../api";
import { t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand, type RulesState } from "./game-api";
import { RuleFields } from "./RuleFields";
import { HostRuleFields } from "./HostRuleFields";
import { useHostRules } from "./useHostRules";
import { switchRuleDraft, type RuleEditorDraft } from "./rule-runtime-state";
import "./actors.css";
import "./character-creation.css";

const FIGURENART_LABEL: Record<ActorKindValue, string> = { player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug" };
const FIGURENARTEN = Object.keys(FIGURENART_LABEL) as ActorKindValue[];
function useTemplateDraft(onDirty: (value: boolean) => void) {
  const [epoch, setEpoch] = useState(0), [dirty, setDirty] = useState(false);
  const active = useRef(0), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const report = useCallback((value: boolean) => {
    if (mounted.current && active.current === epoch) { setDirty(value); onDirty(value); }
  }, [epoch, onDirty]);
  const reset = () => { active.current++; setEpoch(active.current); setDirty(false); onDirty(false); };
  return { epoch, dirty, report, reset, current: () => mounted.current && active.current === epoch };
}
function LoreField({ campaignId, value, onChange }: { campaignId: string; value: string | null; onChange: (value: string | null) => void }) {
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  return <label>{t("Artikel zur Figur oder zum Gegenstand")}<select value={value ?? ""} onChange={e => onChange(e.target.value || null)}>
    <option value="">{t("Ohne Artikelverknüpfung")}</option>{entries.data?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
  </select>{entries.error ? <span role="alert">{entries.error}</span> : null}</label>;
}
function Reason({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>{t("Grund der Änderung")}<input required maxLength={500} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
function RevisionPicker({ head, value, onChange }: { head: number; value: number; onChange: (value: number) => void }) {
  return <label>{t("Revision ansehen")}<select value={value} onChange={e => onChange(Number(e.target.value))}>
    {Array.from({ length: head }, (_, i) => head - i).map(n => <option key={n} value={n}>{n === head ? t("Revision {nummer} (aktuell)", { nummer: n }) : t("Revision {nummer}", { nummer: n })}</option>)}
  </select></label>;
}
function ActorTemplateRevisionView({ campaignId, rules, templateId, revisionNumber }: { campaignId: string; rules: RulesState; templateId: string; revisionNumber: number }) {
  const shown = useResource<TemplateCard<ActorTemplateData>>(apiPath(campaignId, `/actor-templates/${encodeURIComponent(templateId)}?revision=${revisionNumber}`));
  const definition = shown.data?.definition;
  const pkg = definition ? rules.packages.find(p => p.id === definition.package.id && p.version === definition.package.version) : undefined;
  return <section className="panel"><h2>{definition?.name ?? t("Revision {nummer}", { nummer: revisionNumber })}</h2>
    <p className="field-help">{t("Frühere Revision, schreibgeschützt. Eine neue Revision entsteht nur, wenn die aktuelle Vorlage überarbeitet wird.")}</p>
    {shown.loading ? <Loading /> : null}{shown.error ? <Notice error>{shown.error}</Notice> : null}
    {definition ? <div className="actor-command-fields">
      <p>{t("Art der Figur · {art}", { art: t(FIGURENART_LABEL[definition.kind]) })}</p>
      <fieldset disabled><legend>{t("Verknüpfter Artikel")}</legend><LoreField campaignId={campaignId} value={definition.loreEntryId} onChange={() => {}} /></fieldset>
      <p>{t("Regelpaket der Anfangswerte · {paket} · {fassung}", { paket: definition.package.id, fassung: definition.package.version })}</p>
      {pkg ? <fieldset><legend>{t("Anfangswerte dieser Revision")}</legend><RuleFields fields={pkg.fields} values={definition.fields} onChange={() => {}} disabled /></fieldset> : <Notice error>{t("Das Regelpaket dieser Revision ist nicht mehr verfügbar.")}</Notice>}
    </div> : null}
  </section>;
}
export function ActorTemplates({ campaignId, rules, revision, onChanged, onDirty, onOpenLoot, onInstantiate }: {
  campaignId: string; rules: RulesState; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void; onOpenLoot?: () => void; onInstantiate?: (templateId?: string) => void;
}) {
  const list = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [selected, setSelected] = useState<TemplateCard<ActorTemplateData> | null>(null);
  const [viewRevision, setViewRevision] = useState<number | null>(null);
  const [query, setQuery] = useState(""), [saved, setSaved] = useState("");
  const [savedTemplateId, setSavedTemplateId] = useState<string | undefined>();
  const { epoch, dirty, report, reset, current } = useTemplateDraft(onDirty);
  /**
   * Die Freigabe macht eine Werkstattvorlage für Spieler wählbar. Ihre **eigene** Version steht
   * auf der Karte (`freigabe`), und nur von dort kommt `expectedVersion`.
   *
   * Geraten werden darf sie nicht: die Domain zählt bei jedem Umlegen hoch (freigeben 1,
   * entziehen 2, erneut freigeben 3). Ein „freigegeben, also Version 1" wäre nach dem ersten
   * Entzug dauerhaft falsch, und kein Neuladen brächte die richtige Zahl zurück. Die
   * Spielerliste taugt dafür ebenfalls nicht: eine freigegebene Vorlage aus einem fremden
   * Regelpaket fehlt darin, ihre Freigabe steht aber weiter.
   */
  const [quittungen, setQuittungen] = useState<Record<string, FigurvorlageFreigabeStand>>({});
  const freigabe = useTask(), [konflikt, setKonflikt] = useState(false);
  const stand = (karte: TemplateCard<ActorTemplateData>): FigurvorlageFreigabeStand => {
    const receipt = quittungen[karte.id], refreshed = karte.freigabe;
    // A local acknowledgement bridges the next poll; it cannot override a newer grant.
    return receipt && receipt.version > (refreshed?.version ?? 0) ? receipt : refreshed ?? { frei: false, version: 0 };
  };
  const schalte = (karte: TemplateCard<ActorTemplateData>) => void freigabe.run(async () => {
    const jetzt = stand(karte);
    setKonflikt(false);
    try {
      const quittung = await api<FigurantragFreigabeAck>(apiPath(campaignId, `/actor-templates/${encodeURIComponent(karte.id)}/freigabe${jetzt.frei ? "/entziehen" : ""}`),
        { method: jetzt.frei ? "POST" : "PUT", body: { expectedVersion: jetzt.version } });
      setQuittungen(alt => ({ ...alt, [quittung.templateId]: { frei: quittung.freigegeben, version: quittung.version } }));
    } catch (fehler) { if ((fehler as { status?: number }).status === 409) setKonflikt(true); throw fehler; }
    onChanged();
  });
  const choose = (value: TemplateCard<ActorTemplateData> | null) => {
    if (value && selected?.id === value.id && selected.revision === value.revision && selected.version === value.version
      && (viewRevision === null || viewRevision === selected.revision)) return;
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return;
    setSelected(value); setViewRevision(null); setSaved(""); reset();
  };
  const pickRevision = (n: number) => {
    if (n === (viewRevision ?? selected?.revision)) return;
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return;
    setViewRevision(n); reset();
  };
  const visible = list.data?.filter(card => `${card.definition.name} ${t(FIGURENART_LABEL[card.definition.kind])}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  return <div className="creation-workspace"><ol className="creation-path" aria-label={t("Von der Vorlage zur Figur")}>
    <li aria-current="step"><span>01</span><div><strong>{t("Vorlage gestalten")}</strong><small>{t("Name, Art und Anfangswerte")}</small></div></li>
    <li><span>02</span><div><strong>{t("Figur erschaffen")}</strong><small>{t("Eigenen Namen vergeben")}</small></div></li>
    <li><span>03</span><div><strong>{t("Am Tisch spielen")}</strong><small>{t("Bogen und Besitz verwalten")}</small></div></li>
  </ol>{saved ? <div className="creation-saved" role="status"><div><strong>{t("„{name}“ ist als Vorlage gespeichert.", { name: saved })}</strong><p className="field-help">{t("Erschaffe jetzt eine Figur oder gib die Vorlage in der Sammlung für Spieler frei.")}</p></div>{onInstantiate ? <Button variant="primary" onClick={() => onInstantiate(savedTemplateId)}>{t("Aus Vorlage Figur erschaffen")}</Button> : null}</div> : null}
    <div className="actor-columns actor-template-workspace creation-template-workspace"><section className="panel actor-template-library"><h2>{t("Figurvorlagen")}</h2><p className="field-help">{t("Eine Vorlage, viele eigenständige Figuren. Wähle einen Entwurf oder beginne neu.")}</p>
    <Button variant="primary" onClick={() => choose(null)}>{t("Neue Figurvorlage")}</Button>
    {list.data?.length ? <label>{t("Figurvorlagen suchen")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Name oder Figurenart")} /></label> : null}
    {list.error ? <Notice error>{list.error}</Notice> : null}
    {list.loading ? <Loading /> : !list.data?.length ? <p className="field-help">{t("Noch keine Vorlagen gespeichert. Beginne mit Name, Art und Anfangswerten im Formular.")}</p> : null}
    {/* Nur ein Konflikt heisst „inzwischen geaendert"; jeder andere Fehler sagt, was er ist. */}
    {freigabe.error ? <Notice error>{konflikt ? `${freigabe.error} ${t("Die Freigabe wurde inzwischen an anderer Stelle geändert; bitte die Vorlagen neu laden.")}` : freigabe.error}</Notice> : null}
    {query && list.data?.length && !visible.length ? <p className="field-help" role="status">{t("Keine Figurvorlage zu „{suche}“ gefunden.", { suche: query })}</p> : null}
    <ul className="actor-object-list creation-template-list">{visible.map(karte => <li key={karte.id}><Button aria-pressed={selected?.id === karte.id} onClick={() => choose(karte)}>{karte.definition.name}<small>{t("{angabe} · Revision {revision}", { angabe: t(FIGURENART_LABEL[karte.definition.kind]), revision: karte.revision })}</small></Button>
      <span className="creation-release-state" data-shared={stand(karte).frei}>{stand(karte).frei ? t("Für Spieler wählbar") : t("Nur in deiner Werkstatt")}</span>
      <Button variant="quiet" disabled={freigabe.busy} onClick={() => schalte(karte)}>{stand(karte).frei ? t("Freigabe entziehen") : t("Für Spieler freigeben")}</Button></li>)}</ul>
    {onInstantiate && list.data?.length && !saved ? <Button onClick={() => onInstantiate(selected?.id)}>{t("Aus Vorlage Figur erschaffen")}</Button> : null}
    {selected ? <RevisionPicker head={selected.revision} value={viewRevision ?? selected.revision} onChange={pickRevision} /> : null}
  </section>{selected && viewRevision !== null && viewRevision !== selected.revision
    ? <ActorTemplateRevisionView key={`${selected.id}:${viewRevision}`} campaignId={campaignId} rules={rules} templateId={selected.id} revisionNumber={viewRevision} />
    : <ActorTemplateForm key={`${selected?.id ?? "new"}:${epoch}`} campaignId={campaignId} rules={rules} original={selected} onDirty={report} onOpenLoot={onOpenLoot} onSaved={(name, templateId) => { if (current()) { setSelected(null); setViewRevision(null); reset(); setSaved(name ?? ""); setSavedTemplateId(templateId); } onChanged(); }} />}</div></div>;
}
function ActorTemplateForm({ campaignId, rules, original, onDirty, onSaved, onOpenLoot }: {
  campaignId: string; rules: RulesState; original: TemplateCard<ActorTemplateData> | null; onDirty: (dirty: boolean) => void; onSaved: (name?: string, templateId?: string) => void; onOpenLoot?: () => void;
}) {
  const [name, setName] = useState(original?.definition.name ?? ""), [kind, setKind] = useState<ActorKindValue>(original?.definition.kind ?? "npc");
  const [lore, setLore] = useState(original?.definition.loreEntryId ?? null), [reason, setReason] = useState("");
  const [draft, setDraft] = useState<RuleEditorDraft>(() => ({ pin: original?.definition.package ?? rules.pin, fields: original?.definition.fields ?? null }));
  const pin = draft.pin, editor = useHostRules(campaignId, pin, draft.fields);
  const fields = { ...(editor.preview?.valid ? editor.preview.fields : editor.values) };
  const pkg = editor.manifest;
  const setFields = (next: Record<string, Scalar>) => { setDraft(current => current.pin.id === pin.id && current.pin.version === pin.version ? { ...current, fields: next } : current); onDirty(true); };
  const [beute, setBeute] = useState<Beutezeile[]>(original?.definition.schemaVersion === 2 ? original.definition.beute.map(z => ({ ...z })) : []);
  const identityHeading = useRef<HTMLHeadingElement>(null), statsHeading = useRef<HTMLHeadingElement>(null), extrasHeading = useRef<HTMLHeadingElement>(null);
  const gegenstaende = useResource<TemplateCard<ItemContract>[]>(apiPath(campaignId, "/item-templates"), 0);
  const task = useTask(), command = useCommand();
  useEffect(() => () => onDirty(false), [onDirty]);
  // Ohne Beute bleibt die Vorlage Fassung 1. Dieselbe Zurueckhaltung wie beim Kampagnenpaket:
  // nichts wird allein dadurch neu, dass es eine neuere Fassung gibt.
  const definition: ActorTemplateData = beute.length
    ? { schemaVersion: 2, name, kind, loreEntryId: lore, package: pin, fields, beute }
    : { schemaVersion: 1, name, kind, loreEntryId: lore, package: pin, fields };
  const setzeZeile = (i: number, patch: Partial<Beutezeile>) => { setBeute(alt => alt.map((z, n) => n === i ? { ...z, ...patch } : z)); onDirty(true); };
  return <form className="panel creation-template-form" onChange={() => onDirty(true)} onSubmit={event => { event.preventDefault(); if (!name.trim() || !editor.canSave || !pkg) return; void task.run(async () => {
    const saved = await command<TemplateCard<ActorTemplateData>>(apiPath(campaignId, `/actor-templates${original ? `/${encodeURIComponent(original.id)}` : ""}`),
      { definition, packageContentHash: pkg.contentHash, ...(original ? { expectedVersion: original.version, reason } : {}) }, original ? "PUT" : "POST");
    onDirty(false); onSaved(name.trim(), saved.id);
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{original ? t("Neue Vorlagenrevision") : t("Figurvorlage anlegen")}</h2>
    <p className="field-help">{t("Beginne mit der Identität. Die Anfangswerte sind bereits aus deinen Regeln vorbelegt; Hintergrund und Beute ergänzt du bei Bedarf.")}</p>
    <div className="creation-draft-preview" aria-label={t("Zusammenfassung der Figurvorlage")}><span className="creation-monogram" aria-hidden="true">{name.trim().slice(0, 1).toLocaleUpperCase() || "?"}</span><div><small>{t("Vorlage · noch keine Figur")}</small><strong>{name.trim() || t("Deine neue Figurvorlage")}</strong><span>{t(FIGURENART_LABEL[kind])} · {pkg?.name ?? t("Regelpaket fehlt")}</span></div></div>
    <nav className="creation-section-nav" aria-label={t("Bereiche der Figurvorlage")}><Button variant="quiet" onClick={() => identityHeading.current?.focus()}>{t("Identität")}</Button><Button variant="quiet" onClick={() => statsHeading.current?.focus()}>{t("Anfangswerte")}</Button><Button variant="quiet" onClick={() => extrasHeading.current?.focus()}>{t("Hintergrund & Beute")}</Button></nav>
    <section className="creation-form-section"><h3 ref={identityHeading} tabIndex={-1}>{t("Identität")}</h3><p className="field-help">{t("Wie heißt diese Vorlage, und welche Rolle hat die Figur in deiner Welt?")}</p><div className="creation-identity-fields">
    <label>{t("Vorlagenname")}<input required maxLength={160} value={name} placeholder={t("z. B. Waldläuferin, Stadtwache oder Wolf")} onChange={e => setName(e.target.value)} /></label>
    <label>{t("Art der Figur")}<select value={kind} onChange={e => setKind(e.target.value as ActorKindValue)}>{FIGURENARTEN.map(id => <option key={id} value={id}>{t(FIGURENART_LABEL[id])}</option>)}</select></label>
    </div></section>
    <section className="creation-form-section"><h3 ref={statsHeading} tabIndex={-1}>{t("Anfangswerte")}</h3><p className="field-help">{t("Jede neue Figur beginnt mit diesen Werten und erhält danach ihren eigenen Bogen.")}</p>
    <label>{t("Regelpaket für die Anfangswerte")}<select value={`${pin.id}@${pin.version}`} onChange={e => {
      const p = rules.packages.find(p => `${p.id}@${p.version}` === e.target.value); if (p) { setDraft(current => switchRuleDraft(current, { id: p.id, version: p.version })); task.setError(""); onDirty(true); }
    }}>{rules.packages.map(p => <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>{p.name} · {p.version}</option>)}</select></label>
    {pin.id !== rules.pin.id || pin.version !== rules.pin.version ? <Notice>{t("Diese Vorlage verwendet andere Regeln als die Kampagne. Zum Erschaffen einer Figur müssen Vorlage und aktive Kampagnenregeln übereinstimmen.")}</Notice> : null}
    <HostRuleFields state={editor} source={rules.packages.find(candidate => candidate.id === pin.id && candidate.version === pin.version)} onChange={setFields} disabled={task.busy} />
    </section>
    <section className="creation-form-section"><h3 ref={extrasHeading} tabIndex={-1}>{t("Hintergrund & Beute")}</h3><p className="field-help">{t("Optional: Verbinde die Vorlage mit deiner Welt und lege fest, was die Figur bei sich trägt.")}</p>
    <details className="actor-optional" open={!!lore}><summary>{t("Artikel verknüpfen · optional")}</summary><LoreField campaignId={campaignId} value={lore} onChange={setLore} /></details>
    {/* Die Beutetabelle: was diese Art Figur bei sich traegt, und wie wahrscheinlich. Jede Zeile
        wird einzeln entschieden — der Wolf traegt vielleicht das Fell UND vielleicht den Zahn. */}
    <details className="actor-optional" open={beute.length > 0}><summary>{t("Beute dieser Figur · optional")}</summary><fieldset className="sheet-section"><legend>{t("Beutetabelle")}</legend>
      {!gegenstaende.data?.length
        ? <div><p className="field-help">{t("Lege zuerst eine Lootkarte an. Danach kannst du hier wählen, was diese Figur bei sich trägt und mit welcher Wahrscheinlichkeit.")}</p>{onOpenLoot ? <Button onClick={onOpenLoot}>{t("Zu den Lootkarten")}</Button> : null}</div>
        : <>{(() => { const vorlagen = gegenstaende.data; return <>{beute.map((zeile, i) => <div className="rule-fields" key={i}>
            <label>{t("Gegenstand")}<select value={`${zeile.templateId}@${zeile.templateRevision}`} onChange={e => {
              const [id, rev] = e.target.value.split("@");
              setzeZeile(i, { templateId: id!, templateRevision: Number(rev) });
            }}>{vorlagen.map(v => <option key={v.id} value={`${v.id}@${v.revision}`}>{t("{angabe} · Revision {revision}", { angabe: v.definition.name, revision: v.revision })}</option>)}</select></label>
            <label>{t("Wahrscheinlichkeit in Prozent")}<input type="number" min={1} max={100} value={zeile.wahrscheinlichkeit}
              onChange={e => setzeZeile(i, { wahrscheinlichkeit: Math.min(100, Math.max(1, Math.trunc(e.target.valueAsNumber) || 1)) })} /></label>
            <label>{t("Menge von")}<input type="number" min={1} max={1000} value={zeile.menge[0]}
              onChange={e => setzeZeile(i, { menge: [Math.max(1, Math.trunc(e.target.valueAsNumber) || 1), zeile.menge[1]] })} /></label>
            <label>{t("bis")}<input type="number" min={zeile.menge[0]} max={1000} value={zeile.menge[1]}
              onChange={e => setzeZeile(i, { menge: [zeile.menge[0], Math.max(zeile.menge[0], Math.trunc(e.target.valueAsNumber) || zeile.menge[0])] })} /></label>
            <Button onClick={() => { setBeute(alt => alt.filter((_, n) => n !== i)); onDirty(true); }}>{t("Zeile entfernen")}</Button>
          </div>)}
          <Button disabled={beute.length >= 32} onClick={() => { const erste = vorlagen[0]!;
            setBeute(alt => [...alt, { templateId: erste.id, templateRevision: erste.revision, wahrscheinlichkeit: 50, menge: [1, 1] }]); onDirty(true); }}>{t("Beutezeile hinzufügen")}</Button>
          <p className="field-help">{t("Die Beute wird beim Erschaffen einer Figur aus dieser Vorlage ausgewürfelt und liegt dann in ihrem Inventar. Jede Zeile nennt die Gegenstandsvorlage mit ihrer Revision — eine spätere Überarbeitung ändert diese Tabelle also nicht von selbst.")}</p>
        </>; })()}</>}
    </fieldset></details></section>
    {original ? <Reason value={reason} onChange={setReason} /> : null}
    {task.error ? <Notice error>{task.error} {t("Lade die Vorlage erneut, falls inzwischen eine neue Revision gespeichert wurde.")}</Notice> : null}
    <div className="creation-save-actions"><p className="field-help">{t("Nach dem Speichern kannst du aus dieser Vorlage Figuren erschaffen oder sie für Spieler freigeben.")}</p><Button type="submit" variant="primary" disabled={task.busy || !editor.canSave || !name.trim()}>{task.busy ? t("Wird gespeichert …") : original ? t("Revision speichern") : t("Figurvorlage speichern")}</Button></div>
    {original ? <details className="actor-optional"><summary>{t("Vorlage archivieren")}</summary><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => {
      if (window.confirm(t("Vorlage archivieren? Vorhandene Figuren und Revisionen bleiben erhalten."))) void task.run(async () => {
        await command(apiPath(campaignId, `/actor-templates/${original.id}/archive`), { expectedVersion: original.version, reason }); onDirty(false); onSaved();
      });
    }}>{t("Vorlage archivieren")}</Button></details> : null}
  </fieldset></form>;
}
