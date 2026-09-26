// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActorKindValue, ActorTemplateData, Beutezeile, FigurantragFreigabeAck, FigurvorlageFreigabeStand, ItemContract, TemplateCard } from "@chronicle/protocol";
import { stableJson, type Scalar } from "@chronicle/rules";
import { Button, Loading, Notice, StepList, ViewIntro, confirmAction } from "@chronicle/ui";
import { api, apiPath, type EntrySummary } from "../api";
import { t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand, type RulesState } from "./game-api";
import { HostRuleFields } from "./HostRuleFields";
import { useHostRules } from "./useHostRules";
import { switchRuleDraft, type RuleEditorDraft } from "./rule-runtime-state";
import { reasonOrDefault } from "./figuren-gruende";
import { beispielvorlageAnlegen } from "./InstantiateActorHost";
import { Begriff } from "./Begriff";
import "./actors.css";
import "./character-creation.css";

const FIGURENART_LABEL: Record<ActorKindValue, string> = { player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug" };
const FIGURENARTEN = Object.keys(FIGURENART_LABEL) as ActorKindValue[];
const verwerfenFrage = () => confirmAction({ title: t("Ungespeicherte Änderungen verwerfen?"), message: t("Was du an dieser Figurvorlage geändert hast, geht verloren."), confirmLabel: t("Verwerfen"), cancelLabel: t("Weiter bearbeiten"), danger: true });
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
/** Freiwillig: bleibt das Feld leer, trägt der Verlauf einen Standardgrund (`figuren-gruende.ts`). */
function Reason({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>{t("Grund (freiwillig, erscheint im Verlauf)")}<input maxLength={500} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
function RevisionPicker({ head, value, onChange }: { head: number; value: number; onChange: (value: number) => void }) {
  return <label>{t("Frühere Fassung ansehen")}<select value={value} onChange={e => onChange(Number(e.target.value))}>
    {Array.from({ length: head }, (_, i) => head - i).map(n => <option key={n} value={n}>{n === head ? t("Fassung {nummer} (aktuell)", { nummer: n }) : t("Fassung {nummer}", { nummer: n })}</option>)}
  </select></label>;
}
function ActorTemplateRevisionView({ campaignId, rules, templateId, revisionNumber }: { campaignId: string; rules: RulesState; templateId: string; revisionNumber: number }) {
  const shown = useResource<TemplateCard<ActorTemplateData>>(apiPath(campaignId, `/actor-templates/${encodeURIComponent(templateId)}?revision=${revisionNumber}`));
  const definition = shown.data?.definition;
  const editor = useHostRules(campaignId, definition?.package ?? rules.pin, definition?.fields ?? null);
  const pkg = definition ? rules.packages.find(p => p.id === definition.package.id && p.version === definition.package.version) : undefined;
  return <section className="panel"><h2>{definition?.name ?? t("Fassung {nummer}", { nummer: revisionNumber })}</h2>
    <p className="field-help">{t("Frühere Fassung, nur zum Ansehen. Eine neue Fassung entsteht, wenn du die aktuelle Vorlage überarbeitest.")}</p>
    {shown.loading ? <Loading /> : null}{shown.error ? <Notice error>{shown.error}</Notice> : null}
    {definition ? <div className="actor-command-fields">
      <p>{t("Art der Figur · {art}", { art: t(FIGURENART_LABEL[definition.kind]) })}</p>
      <fieldset disabled><legend>{t("Verknüpfter Artikel")}</legend><LoreField campaignId={campaignId} value={definition.loreEntryId} onChange={() => {}} /></fieldset>
      <p>{t("Regelwerk der Anfangswerte: {name}, Version {version}", { name: pkg?.name ?? definition.package.id, version: definition.package.version })}</p>
      <fieldset><legend>{t("Anfangswerte dieser Fassung")}</legend><HostRuleFields state={editor} source={pkg} onChange={() => {}} disabled /></fieldset>
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
  const beispiel = useTask(), command = useCommand();
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
  const choose = async (value: TemplateCard<ActorTemplateData> | null) => {
    if (value && selected?.id === value.id && selected.revision === value.revision && selected.version === value.version
      && (viewRevision === null || viewRevision === selected.revision)) return;
    if (dirty && !await verwerfenFrage()) return;
    setSelected(value); setViewRevision(null); setSaved(""); reset();
  };
  const pickRevision = async (n: number) => {
    if (n === (viewRevision ?? selected?.revision)) return;
    if (dirty && !await verwerfenFrage()) return;
    setViewRevision(n); reset();
  };
  const mitBeispiel = () => void beispiel.run(async () => {
    const karte = await beispielvorlageAnlegen(campaignId, rules.pin, command);
    setSelected(karte); setViewRevision(null); reset(); setSaved(karte.definition.name); setSavedTemplateId(karte.id); onChanged();
  });
  const leer = !list.loading && !list.error && !list.data?.length;
  // Genau ein hervorgehobener nächster Schritt: nach dem Speichern „Figur anlegen“, in einer leeren
  // Sammlung „Mit Beispiel beginnen“, sonst das Speichern im Formular.
  const hervorgehoben: "angelegt" | "beispiel" | "formular" = saved && !dirty ? "angelegt" : leer && !dirty ? "beispiel" : "formular";
  /** Die Freigabe für Mitspieler an der Stelle, an der man die Vorlage ansieht — mit einem Satz, was sie bewirkt. */
  const freigabeZeile = (karte: TemplateCard<ActorTemplateData>) => { const frei = stand(karte).frei; return <div className="creation-freigabe" data-shared={frei}>
    <p>{frei ? t("Mitspieler können aus „{name}“ eine Figur beantragen.", { name: karte.definition.name }) : t("Mitspieler können aus „{name}“ noch keine Figur beantragen. Gib die Vorlage dafür frei.", { name: karte.definition.name })} <Begriff id="antrag" /></p>
    <Button disabled={freigabe.busy} onClick={() => schalte(karte)}>{frei ? t("Freigabe entziehen") : t("Für Spieler freigeben")}</Button>
  </div>; };
  const gespeichert = list.data?.find(karte => karte.id === savedTemplateId) ?? null;
  const visible = list.data?.filter(card => `${card.definition.name} ${t(FIGURENART_LABEL[card.definition.kind])}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  return <div className="creation-workspace">
    <ViewIntro id="figurvorlagen-titel" level={3} title={t("Figurvorlagen")} action={<Button onClick={() => void choose(null)}>{t("Neue Figurvorlage")}</Button>} steps={[
      t("Gib der Vorlage einen Namen und wähle, was für eine Figur sie beschreibt."),
      t("Die Anfangswerte kommen aus deinem Regelwerk. Ändere, was anders sein soll, und speichere."),
      t("Lege daraus Figuren an oder gib die Vorlage für Spieler frei."),
    ]}>{t("Eine Figurvorlage ist ein Muster, aus dem du beliebig viele Figuren anlegst, zum Beispiel „Stadtwache“.")} <Begriff id="figurvorlage" /></ViewIntro>
    <StepList label={t("Von der Vorlage zur Figur")} className="creation-steps" steps={[
      { id: "vorlage", label: t("Figurvorlage gestalten"), state: "current" },
      { id: "figur", label: t("Figur anlegen"), state: "todo", ...(onInstantiate ? { onSelect: () => onInstantiate(selected?.id) } : {}) },
      { id: "tisch", label: t("Am Tisch spielen"), state: "todo" },
    ]} />
    {saved ? <div className="creation-saved" role="status"><div><strong>{t("„{name}“ ist als Vorlage gespeichert.", { name: saved })}</strong><p className="field-help">{t("Lege jetzt eine Figur daraus an oder gib die Vorlage für Spieler frei, damit sie eine Figur beantragen können.")}</p></div>{onInstantiate ? <Button variant={hervorgehoben === "angelegt" ? "primary" : "default"} onClick={() => onInstantiate(savedTemplateId)}>{t("Figur aus dieser Vorlage anlegen")}</Button> : null}
      {gespeichert ? freigabeZeile(gespeichert) : null}</div> : null}
    <div className="actor-columns actor-template-workspace creation-template-workspace"><section className="panel actor-template-library" aria-label={t("Deine Figurvorlagen")}>
    {list.data?.length ? <p className="field-help">{t("Freigegebene Vorlagen können deine Mitspieler unter „Ich“ als Figur beantragen.")} <Begriff id="antrag" /></p> : null}
    {list.data?.length ? <label>{t("Figurvorlagen suchen")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Name oder Figurenart")} /></label> : null}
    {list.error ? <Notice error>{list.error}</Notice> : null}
    {list.loading ? <Loading /> : leer ? <div className="actor-empty-hint"><p>{t("Noch keine Figurvorlage. Beginne mit der Beispielfigur deines Regelwerks oder trag rechts Name, Art und Anfangswerte ein.")}</p>
      <Button variant={hervorgehoben === "beispiel" ? "primary" : "default"} disabled={beispiel.busy} onClick={mitBeispiel}>{beispiel.busy ? t("Beispiel wird angelegt …") : t("Mit Beispiel beginnen")}</Button>
      {beispiel.error ? <Notice error>{beispiel.error}</Notice> : null}</div> : null}
    {/* Nur ein Konflikt heisst „inzwischen geaendert"; jeder andere Fehler sagt, was er ist. */}
    {freigabe.error ? <Notice error>{konflikt ? `${freigabe.error} ${t("Die Freigabe wurde inzwischen an anderer Stelle geändert; bitte die Vorlagen neu laden.")}` : freigabe.error}</Notice> : null}
    {query && list.data?.length && !visible.length ? <p className="field-help" role="status">{t("Keine Figurvorlage zu „{suche}“ gefunden.", { suche: query })}</p> : null}
    <ul className="actor-object-list creation-template-list">{visible.map(karte => <li key={karte.id}><Button aria-pressed={selected?.id === karte.id} onClick={() => void choose(karte)}>{karte.definition.name}<small>{t("{angabe} · Fassung {nummer}", { angabe: t(FIGURENART_LABEL[karte.definition.kind]), nummer: karte.revision })}</small></Button>
      <span className="creation-release-state" data-shared={stand(karte).frei}>{stand(karte).frei ? t("Für Spieler wählbar") : t("Nur in deiner Werkstatt")}</span>
      <Button disabled={freigabe.busy} onClick={() => schalte(karte)}>{stand(karte).frei ? t("Freigabe entziehen") : t("Für Spieler freigeben")}</Button></li>)}</ul>
    {onInstantiate && list.data?.length && !saved ? <Button onClick={() => onInstantiate(selected?.id)}>{t("Figur aus Vorlage anlegen")}</Button> : null}
    {selected ? <RevisionPicker head={selected.revision} value={viewRevision ?? selected.revision} onChange={n => void pickRevision(n)} /> : null}
  </section>{selected && viewRevision !== null && viewRevision !== selected.revision
    ? <ActorTemplateRevisionView key={`${selected.id}:${viewRevision}`} campaignId={campaignId} rules={rules} templateId={selected.id} revisionNumber={viewRevision} />
    : <ActorTemplateForm key={`${selected?.id ?? "new"}:${epoch}`} campaignId={campaignId} rules={rules} original={selected} freigabe={selected ? freigabeZeile(list.data?.find(karte => karte.id === selected.id) ?? selected) : undefined} hervorheben={hervorgehoben === "formular"} onDirty={report} onOpenLoot={onOpenLoot} onSaved={(name, karte) => {
      // Nach dem Speichern bleibt die gespeicherte Vorlage offen. Früher sprang das Formular auf eine
      // neue, leere Vorlage — wer weitertippte, legte Doppel an, und „Figur anlegen“ ging unter.
      if (current()) { setSelected(karte ?? null); setViewRevision(null); reset(); setSaved(name ?? ""); setSavedTemplateId(karte?.id); } onChanged(); }} />}</div></div>;
}
function ActorTemplateForm({ campaignId, rules, original, freigabe, hervorheben, onDirty, onSaved, onOpenLoot }: {
  campaignId: string; rules: RulesState; original: TemplateCard<ActorTemplateData> | null; freigabe?: ReactNode; hervorheben: boolean; onDirty: (dirty: boolean) => void; onSaved: (name?: string, karte?: TemplateCard<ActorTemplateData>) => void; onOpenLoot?: () => void;
}) {
  const [name, setName] = useState(original?.definition.name ?? ""), [kind, setKind] = useState<ActorKindValue>(original?.definition.kind ?? "npc");
  const [lore, setLore] = useState(original?.definition.loreEntryId ?? null), [reason, setReason] = useState("");
  const [draft, setDraft] = useState<RuleEditorDraft>(() => ({ pin: original?.definition.package ?? rules.pin, fields: original?.definition.fields ?? null }));
  const pin = draft.pin, editor = useHostRules(campaignId, pin, draft.fields);
  const fields = { ...(editor.preview?.valid ? editor.preview.fields : editor.values) };
  const pkg = editor.manifest;
  const setFields = (next: Record<string, Scalar>) => { setDraft(current => current.pin.id === pin.id && current.pin.version === pin.version ? { ...current, fields: next } : current); };
  const [beute, setBeute] = useState<Beutezeile[]>(original?.definition.schemaVersion === 2 ? original.definition.beute.map(z => ({ ...z })) : []);
  const identityHeading = useRef<HTMLHeadingElement>(null), statsHeading = useRef<HTMLHeadingElement>(null), extrasHeading = useRef<HTMLHeadingElement>(null);
  const gegenstaende = useResource<TemplateCard<ItemContract>[]>(apiPath(campaignId, "/item-templates"), 0);
  const task = useTask(), command = useCommand(), sperrId = useId();
  const baselineFields = original?.definition.fields ?? editor.manifest?.defaults ?? {};
  const baseline = useMemo(() => stableJson({
    name: original?.definition.name ?? "", kind: original?.definition.kind ?? "npc", lore: original?.definition.loreEntryId ?? null,
    pin: original?.definition.package ?? rules.pin, fields: baselineFields,
    beute: original?.definition.schemaVersion === 2 ? original.definition.beute : [], reason: "",
  }), [baselineFields, original, rules.pin]);
  const currentState = useMemo(() => stableJson({ name, kind, lore, pin, fields, beute, reason }), [name, kind, lore, pin, fields, beute, reason]);
  const dirty = currentState !== baseline;
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  const discard = async () => {
    if (dirty && !await confirmAction({ title: t("Änderungen verwerfen?"), message: t("Die Vorlage springt auf den gespeicherten Stand zurück."), confirmLabel: t("Verwerfen"), cancelLabel: t("Weiter bearbeiten"), danger: true })) return;
    setName(original?.definition.name ?? ""); setKind(original?.definition.kind ?? "npc"); setLore(original?.definition.loreEntryId ?? null); setReason("");
    setDraft({ pin: original?.definition.package ?? rules.pin, fields: original?.definition.fields ?? null });
    setBeute(original?.definition.schemaVersion === 2 ? original.definition.beute.map(z => ({ ...z })) : []); task.setError(""); onDirty(false);
  };
  const archivieren = async () => {
    if (!original || !await confirmAction({ title: t("Vorlage archivieren?"), message: t("Vorhandene Figuren und frühere Fassungen bleiben erhalten. Neue Figuren entstehen daraus nicht mehr."), confirmLabel: t("Vorlage archivieren"), danger: true })) return;
    void task.run(async () => {
      await command(apiPath(campaignId, `/actor-templates/${original.id}/archive`), { expectedVersion: original.version, reason: reasonOrDefault(reason, "vorlage") }); onDirty(false); onSaved();
    });
  };
  // Ohne Beute bleibt die Vorlage Fassung 1. Dieselbe Zurueckhaltung wie beim Kampagnenpaket:
  // nichts wird allein dadurch neu, dass es eine neuere Fassung gibt.
  const definition: ActorTemplateData = beute.length
    ? { schemaVersion: 2, name, kind, loreEntryId: lore, package: pin, fields, beute }
    : { schemaVersion: 1, name, kind, loreEntryId: lore, package: pin, fields };
  const setzeZeile = (i: number, patch: Partial<Beutezeile>) => { setBeute(alt => alt.map((z, n) => n === i ? { ...z, ...patch } : z)); };
  const sperre = !name.trim() ? t("Gib der Vorlage zuerst einen Namen.") : editor.error || (editor.preview && !editor.preview.valid) ? t("Ein Anfangswert passt noch nicht zu den Regeln. Die Meldung oben nennt ihn.")
    : !editor.canSave ? t("Die Regeln prüfen die Werte noch …") : "";
  return <form className="panel creation-template-form" onSubmit={event => { event.preventDefault(); if (!name.trim() || !editor.canSave || !pkg) return; void task.run(async () => {
    const saved = await command<TemplateCard<ActorTemplateData>>(apiPath(campaignId, `/actor-templates${original ? `/${encodeURIComponent(original.id)}` : ""}`),
      { definition, packageContentHash: pkg.contentHash, ...(original ? { expectedVersion: original.version, reason: reasonOrDefault(reason, "vorlage") } : {}) }, original ? "PUT" : "POST");
    onDirty(false); onSaved(name.trim(), saved);
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{original ? t("Figurvorlage überarbeiten") : t("Figurvorlage anlegen")}</h2>
    <p className="field-help">{t("Beginne mit der Identität. Die Anfangswerte sind bereits aus deinen Regeln vorbelegt; Hintergrund und Beute ergänzt du bei Bedarf.")}</p>
    <div className="creation-draft-preview" aria-label={t("Zusammenfassung der Figurvorlage")}><span className="creation-monogram" aria-hidden="true">{name.trim().slice(0, 1).toLocaleUpperCase() || "?"}</span><div><small>{t("Vorlage · noch keine Figur")}</small><strong>{name.trim() || t("Deine neue Figurvorlage")}</strong><span>{t(FIGURENART_LABEL[kind])} · {pkg?.name ?? t("Regelpaket fehlt")}</span></div></div>
    {freigabe}
    <nav className="creation-section-nav" aria-label={t("Bereiche der Figurvorlage")}><Button variant="quiet" onClick={() => identityHeading.current?.focus()}>{t("Identität")}</Button><Button variant="quiet" onClick={() => statsHeading.current?.focus()}>{t("Anfangswerte")}</Button><Button variant="quiet" onClick={() => extrasHeading.current?.focus()}>{t("Hintergrund & Beute")}</Button></nav>
    <section className="creation-form-section"><h3 ref={identityHeading} tabIndex={-1}>{t("Identität")}</h3><p className="field-help">{t("Wie heißt diese Vorlage, und welche Rolle hat die Figur in deiner Welt?")}</p><div className="creation-identity-fields">
    <label>{t("Vorlagenname")}<input required maxLength={160} value={name} placeholder={t("z. B. Waldläuferin, Stadtwache oder Wolf")} onChange={e => setName(e.target.value)} /></label>
    <label>{t("Art der Figur")}<select value={kind} onChange={e => setKind(e.target.value as ActorKindValue)}>{FIGURENARTEN.map(id => <option key={id} value={id}>{t(FIGURENART_LABEL[id])}</option>)}</select></label>
    </div></section>
    <section className="creation-form-section"><h3 ref={statsHeading} tabIndex={-1}>{t("Anfangswerte")}</h3><p className="field-help">{t("Jede neue Figur beginnt mit diesen Werten und erhält danach ihren eigenen Bogen.")}</p>
    <label>{t("Regelwerk für die Anfangswerte")}<select value={`${pin.id}@${pin.version}`} onChange={e => {
      const p = rules.packages.find(p => `${p.id}@${p.version}` === e.target.value); if (p) { setDraft(current => switchRuleDraft(current, { id: p.id, version: p.version })); task.setError(""); }
    }}>{rules.packages.map(p => <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>{t("{name}, Version {version}", { name: p.name, version: p.version })}</option>)}</select></label>
    {pin.id !== rules.pin.id || pin.version !== rules.pin.version ? <Notice tone="info">{t("Diese Vorlage ist an ihr eigenes Regelpaket gebunden. Figuren daraus behalten diese Regeln auch dann, wenn die Kampagne inzwischen ein anderes Standardregelwerk verwendet.")}</Notice> : null}
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
            }}>{vorlagen.map(v => <option key={v.id} value={`${v.id}@${v.revision}`}>{t("{angabe} · Fassung {nummer}", { angabe: v.definition.name, nummer: v.revision })}</option>)}</select></label>
            <label>{t("Wahrscheinlichkeit in Prozent")}<input type="number" min={1} max={100} value={zeile.wahrscheinlichkeit}
              onChange={e => setzeZeile(i, { wahrscheinlichkeit: Math.min(100, Math.max(1, Math.trunc(e.target.valueAsNumber) || 1)) })} /></label>
            <label>{t("Menge von")}<input type="number" min={1} max={1000} value={zeile.menge[0]}
              onChange={e => setzeZeile(i, { menge: [Math.max(1, Math.trunc(e.target.valueAsNumber) || 1), zeile.menge[1]] })} /></label>
            <label>{t("bis")}<input type="number" min={zeile.menge[0]} max={1000} value={zeile.menge[1]}
              onChange={e => setzeZeile(i, { menge: [zeile.menge[0], Math.max(zeile.menge[0], Math.trunc(e.target.valueAsNumber) || zeile.menge[0])] })} /></label>
            <Button onClick={() => { setBeute(alt => alt.filter((_, n) => n !== i)); }}>{t("Zeile entfernen")}</Button>
          </div>)}
          <Button disabled={beute.length >= 32} onClick={() => { const erste = vorlagen[0]!;
            setBeute(alt => [...alt, { templateId: erste.id, templateRevision: erste.revision, wahrscheinlichkeit: 50, menge: [1, 1] }]); }}>{t("Beutezeile hinzufügen")}</Button>
          <p className="field-help">{t("Die Beute wird beim Anlegen einer Figur aus dieser Vorlage ausgewürfelt und liegt dann in ihrem Inventar. Jede Zeile nennt die Lootkarte mit ihrer Fassung — eine spätere Überarbeitung ändert diese Tabelle also nicht von selbst.")}</p>
        </>; })()}</>}
    </fieldset></details></section>
    {original ? <Reason value={reason} onChange={setReason} /> : null}
    {/* Nur ein Konflikt (409) heißt „inzwischen geändert“; jeder andere Fehler sagt selbst, was er ist. */}
    {task.error ? <Notice error>{task.error}{task.status === 409 ? ` ${t("Lade die Vorlage erneut, falls inzwischen eine neue Fassung gespeichert wurde.")}` : ""}</Notice> : null}
  </fieldset>
    {/* Der Ausweg liegt außerhalb des gesperrten Bereichs: „Verwerfen“ bleibt auch dann bedienbar,
        wenn ein Speichern hängt. Es setzt nur den Entwurf zurück; ein laufender Befehl läuft aus. */}
    <div className="creation-save-actions"><div className="button-row">
      <Button type="submit" variant={hervorheben ? "primary" : "default"} disabled={task.busy || !!sperre} aria-describedby={sperre ? sperrId : undefined}>{task.busy ? t("Wird gespeichert …") : original ? t("Neue Fassung speichern") : t("Figurvorlage speichern")}</Button>
      <Button type="button" variant="quiet" disabled={!dirty} onClick={() => void discard()}>{t("Änderungen verwerfen")}</Button></div>
      {sperre ? <p id={sperrId} className="field-help">{sperre}</p> : <p className="field-help">{t("Nach dem Speichern kannst du aus dieser Vorlage Figuren anlegen oder sie für Spieler freigeben.")}</p>}</div>
    {original ? <details className="actor-optional"><summary>{t("Vorlage archivieren")}</summary><p className="field-help">{t("Vorhandene Figuren und frühere Fassungen bleiben erhalten.")}</p>
      <Button variant="danger" disabled={task.busy} onClick={() => void archivieren()}>{t("Vorlage archivieren")}</Button></details> : null}
  </form>;
}
