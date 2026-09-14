// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard, ActorKindValue, ActorTemplateData, Beutezeile, ControllerCard, FigurantragCard, FigurantragFreigabeAck, FigurvorlageFreigabeStand, ItemCard, ItemContract, ItemState, LootRarityValue, TemplateCard } from "@chronicle/protocol";
import { LOOT_RARITIES } from "@chronicle/protocol";
import { Lootkarte, seltenheitText } from "./Lootkarte";
import { speicherstats } from "./speicherstats";
import { uebergabeplan } from "./beute";
import { Geldzaehler } from "./Geldzaehler";
import type { Scalar } from "@chronicle/rules";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { PackageOpen } from "lucide-react";
import { api, apiPath, errorText, type EntrySummary, type Member, type WikiMedienBestand } from "../api";
import { plural, t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { defaults, useCommand, type RulesState } from "./game-api";
import { RuleFields } from "./RuleFields";
import type { ForgeSection } from "./forge-navigation";
import { WikiMedien } from "./WikiMedien";
import "./actors.css";
import "./character-creation.css";

// Anzeigetabelle der Figurenarten: der Client übersetzt sie an der Anzeigestelle mit
// `t(FIGURENART_LABEL[art])`; die gespeicherte Art bleibt der englische Datenschlüssel.
const FIGURENART_LABEL: Record<ActorKindValue, string> = { player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug" };
const FIGURENARTEN = Object.keys(FIGURENART_LABEL) as ActorKindValue[];
type View = "actors" | "templates" | "item-templates" | "antraege";
// A completed request belongs to the editor that submitted it, even when the user
// deliberately navigates to a different draft before its response arrives.
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
export function ActorWorkbench({ campaignId, gm, actorId, actors, roster, rules, revision, onChanged, onDirty, onOpenForge }: {
  campaignId: string; gm: boolean; actorId: string; actors: ActorCard[]; roster: Member[]; rules: RulesState;
  revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void; onOpenForge?: (section: ForgeSection) => void;
}) {
  const [view, setView] = useState<View>("actors"), [dirtyParts, setDirtyParts] = useState({ details: false, inventory: false, templates: false, creation: false });
  const dirty = Object.values(dirtyParts).some(Boolean);
  const reportDetails = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, details: value })), []);
  const reportInventory = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, inventory: value })), []);
  const reportTemplates = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, templates: value })), []);
  const reportCreation = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, creation: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const selected = actors.find(a => a.id === actorId);
  const createSelect = useRef<HTMLSelectElement>(null);
  return <div className="actor-workbench">
    {gm && onOpenForge ? <aside className="actor-forge-entry"><div><strong>{t("Neue Figuren und Lootkarten entstehen in der Schmiede.")}</strong><p className="field-help">{t("Hier verwaltest du eure Figuren und ihren Besitz.")}</p></div><div className="button-row"><Button onClick={() => onOpenForge("actors")}>{t("Figurvorlagen")}</Button><Button onClick={() => onOpenForge("loot")}>{t("Lootkarten erstellen")}</Button></div></aside> : null}
    {/* Die Vorlagenreiter entfallen, wo die Schmiede sie führt; die Anträge stehen in beiden
        Fällen hier, denn sie sind keine Werkstattarbeit, sondern eine Entscheidung am Tisch. */}
    {gm ? <div className="view-tabs" aria-label={t("Figurenverwaltung")}>{(onOpenForge
      ? [["actors", t("Figuren & Besitz")], ["antraege", t("Anträge")]]
      : [["actors", t("Figuren & Besitz")], ["templates", t("Figurvorlagen")], ["item-templates", t("Gegenstandsvorlagen")], ["antraege", t("Anträge")]]
    ).map(([id, label]) => <Button key={id} aria-pressed={view === id} onClick={() => {
      if (view === id) return;
      if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
      setView(id as View); setDirtyParts({ details: false, inventory: false, templates: false, creation: false });
    }}>{label}</Button>)}</div> : null}
    {view === "antraege" && gm ? <Figurantraege campaignId={campaignId} rules={rules} revision={revision} onChanged={onChanged} />
      : view === "templates" && gm ? <ActorTemplates campaignId={campaignId} rules={rules} revision={revision} onChanged={onChanged} onDirty={reportTemplates} />
      : view === "item-templates" && gm ? <ItemTemplates campaignId={campaignId} revision={revision} onChanged={onChanged} onDirty={reportTemplates} />
      : <><div className="actor-columns">{selected ? <ActorDetails key={selected.id} campaignId={campaignId} current={selected} gm={gm} roster={roster} revision={revision} onChanged={onChanged} onDirty={reportDetails} />
        : gm ? <EmptyState title={t("Noch keine Figur ausgewählt.")} action={<Button variant="primary" onClick={() => createSelect.current?.focus()}>{t("Figur erschaffen")}</Button>}>{t("Du musst nicht warten, bis jemand beitritt: Als Spielleitung legst du selbst eine Figurvorlage an und erschaffst daraus direkt eine eigenständige Figur.")}</EmptyState>
        : <EmptyState title={t("Noch keine Figur ausgewählt.")}>{t("Die Spielleitung legt Figurvorlagen an und erschafft daraus eigenständige Figuren.")}</EmptyState>}
        {gm ? <InstantiateActor campaignId={campaignId} rules={rules} revision={revision} onChanged={onChanged} selectRef={createSelect} onDirty={reportCreation} onCreateTemplate={onOpenForge ? () => onOpenForge("actors") : () => { if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) setView("templates"); }} /> : null}</div>
        <Inventory key={`${actorId}:${gm}`} campaignId={campaignId} actorId={actorId} actors={actors} gm={gm} revision={revision} onChanged={onChanged} onDirty={reportInventory} onCreateTemplate={gm && onOpenForge ? () => onOpenForge("loot") : undefined} />
      </>}
  </div>;
}

/**
 * Die offenen Figuranträge — die Arbeitsliste der Spielleitung.
 *
 * **Die Abweichung steht auf der Karte, nicht hinter einem Klick.** Ohne sie bestätigte die
 * Spielleitung einen Namen und eine Vorlage, aber nicht die Werte, die dabei entstehen. Gezeigt
 * wird deshalb genau das, was der Server als `anfangswerte` gespeichert hat — die geprüften
 * Wünsche, nicht die Eingabe des Spielers.
 *
 * **`expectedVersion` kommt von der Karte.** Zwei Spielleitungen, die denselben Antrag
 * gleichzeitig entscheiden, sollen nicht beide gewinnen; die zweite bekommt einen Konflikt und
 * den Hinweis, die Liste neu zu laden.
 */
function Figurantraege({ campaignId, rules, revision, onChanged }: { campaignId: string; rules: RulesState; revision: number; onChanged: () => void }) {
  const list = useResource<FigurantragCard[]>(apiPath(campaignId, "/figurantraege"), revision);
  const vorlagen = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [gruende, setGruende] = useState<Record<string, string>>({});
  const task = useTask(), [konflikt, setKonflikt] = useState(false);
  const paket = rules.packages.find(p => p.id === rules.pin.id && p.version === rules.pin.version);
  const feldname = (schluessel: string) => paket?.fields[schluessel]?.label ?? schluessel;
  const grund = (id: string) => gruende[id] ?? "";
  const entscheide = (antrag: FigurantragCard, weg: "bestaetigen" | "ablehnen") => void task.run(async () => {
    setKonflikt(false);
    try {
      await api(apiPath(campaignId, `/figurantraege/${encodeURIComponent(antrag.id)}/${weg}`),
        { method: "POST", body: weg === "ablehnen" ? { expectedVersion: antrag.version, reason: grund(antrag.id).trim() } : { expectedVersion: antrag.version } });
    } catch (fehler) { if ((fehler as { status?: number }).status === 409) setKonflikt(true); throw fehler; }
    setGruende(alt => { const next = { ...alt }; delete next[antrag.id]; return next; });
    onChanged();
  });
  return <section className="panel"><h2>{t("Anträge auf eine Figur")}</h2>
    <p className="field-help">{t("Bestätigst du, entsteht die Figur aus der beantragten Vorlagenrevision und gehört der antragstellenden Person.")}</p>
    {list.error || vorlagen.error ? <Notice error>{list.error || vorlagen.error}</Notice> : null}
    {task.error ? <><Notice error>{konflikt ? `${task.error} ${t("Der Antrag wurde inzwischen geändert.")}` : task.error}</Notice><Button onClick={onChanged}>{t("Anträge neu laden")}</Button></> : null}
    {list.loading ? <Loading /> : !list.data?.length ? <p className="field-help">{t("Zurzeit wartet kein Antrag auf eine Entscheidung.")}</p> : null}
    <ul className="actor-object-list">{list.data?.map(antrag => <li key={antrag.id}>
      <strong>{antrag.name}</strong>
      <p className="field-help">{t("Vorlage {vorlage} · Revision {revision}", { vorlage: vorlagen.data?.find(v => v.id === antrag.templateId)?.definition.name ?? antrag.templateId, revision: antrag.templateRevision })}</p>
      {Object.keys(antrag.anfangswerte).length
        ? <ul className="rule-fields">{Object.entries(antrag.anfangswerte).map(([schluessel, wert]) => <li key={schluessel}>{feldname(schluessel)} · {String(wert)}</li>)}</ul>
        : <p className="field-help">{t("Ohne Abweichung — die Werte der Vorlage bleiben, wie sie sind.")}</p>}
      <label>{t("Grund einer Ablehnung")}<input maxLength={500} value={grund(antrag.id)} onChange={event => { const wert = event.target.value; setGruende(alt => ({ ...alt, [antrag.id]: wert })); }} /></label>
      <div className="button-row">
        <Button variant="primary" disabled={task.busy} onClick={() => entscheide(antrag, "bestaetigen")}>{t("Bestätigen")}</Button>
        <Button variant="danger" disabled={task.busy || !grund(antrag.id).trim()} onClick={() => entscheide(antrag, "ablehnen")}>{t("Ablehnen")}</Button>
      </div>
    </li>)}</ul>
  </section>;
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
  const [pin, setPin] = useState(original?.definition.package ?? rules.pin);
  const pkg = rules.packages.find(p => p.id === pin.id && p.version === pin.version);
  const [fields, setFields] = useState<Record<string, Scalar>>(original?.definition.fields ?? (pkg ? defaults(pkg.fields) : {}));
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
  return <form className="panel creation-template-form" onChange={() => onDirty(true)} onSubmit={event => { event.preventDefault(); if (!name.trim() || !pkg) return; void task.run(async () => {
    const saved = await command<TemplateCard<ActorTemplateData>>(apiPath(campaignId, `/actor-templates${original ? `/${encodeURIComponent(original.id)}` : ""}`),
      { definition, ...(original ? { expectedVersion: original.version, reason } : {}) }, original ? "PUT" : "POST");
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
      const p = rules.packages.find(p => `${p.id}@${p.version}` === e.target.value)!; setPin({ id: p.id, version: p.version }); setFields(defaults(p.fields));
    }}>{rules.packages.map(p => <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>{p.name} · {p.version}</option>)}</select></label>
    {pin.id !== rules.pin.id || pin.version !== rules.pin.version ? <Notice>{t("Diese Vorlage verwendet andere Regeln als die Kampagne. Zum Erschaffen einer Figur müssen Vorlage und aktive Kampagnenregeln übereinstimmen.")}</Notice> : null}
    {pkg ? <RuleFields fields={pkg.fields} values={fields} onChange={setFields} /> : <Notice error>{t("Das gespeicherte Regelpaket ist nicht verfügbar.")}</Notice>}
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
    <div className="creation-save-actions"><p className="field-help">{t("Nach dem Speichern kannst du aus dieser Vorlage Figuren erschaffen oder sie für Spieler freigeben.")}</p><Button type="submit" variant="primary" disabled={task.busy || !pkg || !name.trim()}>{task.busy ? t("Wird gespeichert …") : original ? t("Revision speichern") : t("Figurvorlage speichern")}</Button></div>
    {original ? <details className="actor-optional"><summary>{t("Vorlage archivieren")}</summary><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => {
      if (window.confirm(t("Vorlage archivieren? Vorhandene Figuren und Revisionen bleiben erhalten."))) void task.run(async () => {
        await command(apiPath(campaignId, `/actor-templates/${original.id}/archive`), { expectedVersion: original.version, reason }); onDirty(false); onSaved();
      });
    }}>{t("Vorlage archivieren")}</Button></details> : null}
  </fieldset></form>;
}
export function InstantiateActor({ campaignId, rules, initialTemplateId = "", revision, onChanged, selectRef, onDirty, onCreateTemplate }: { campaignId: string; rules?: RulesState; initialTemplateId?: string; revision: number; onChanged: () => void; selectRef?: { current: HTMLSelectElement | null }; onDirty?: (dirty: boolean) => void; onCreateTemplate?: () => void }) {
  const templates = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [selected, setSelected] = useState(initialTemplateId), [name, setName] = useState(""), [created, setCreated] = useState(""); const task = useTask(), command = useCommand();
  useEffect(() => { onDirty?.(!!name); }, [name, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  const template = templates.data?.find(t => t.id === selected);
  const compatible = !rules || !!template && template.definition.package.id === rules.pin.id && template.definition.package.version === rules.pin.version;
  const pkg = rules?.packages.find(p => p.id === template?.definition.package.id && p.version === template?.definition.package.version);
  return <form className="panel creation-instantiate" onSubmit={event => { event.preventDefault(); if (template && compatible) void task.run(async () => {
    await command(apiPath(campaignId, "/actors/instantiate"), { templateId: template.id, templateRevision: template.revision, ...(name.trim() ? { name } : {}) }); setCreated(name.trim() || template.definition.name); setName(""); onChanged();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{t("Figur aus Vorlage erschaffen")}</h2><p className="field-help">{t("Wähle eine Vorlage und gib der neuen Figur bei Bedarf einen eigenen Namen.")}</p>{templates.loading ? <Loading /> : !templates.data?.length && !templates.error ? <div className="actor-empty-hint"><p>{t("Du brauchst zuerst eine Figurvorlage mit Name, Art und Werten.")}</p>{onCreateTemplate ? <Button onClick={onCreateTemplate}>{t("Figurvorlage anlegen")}</Button> : null}</div> : null}
    <div className="creation-identity-fields"><label>{t("Figurvorlage")}<select ref={selectRef} required value={selected} onChange={e => { setSelected(e.target.value); setCreated(""); }}><option value="">{t("Vorlage wählen")}</option>{templates.data?.map(karte => <option key={karte.id} value={karte.id}>{t("{angabe} · Revision {revision}", { angabe: karte.definition.name, revision: karte.revision })}</option>)}</select></label>
    <label>{t("Name dieser Figur")}<input maxLength={160} value={name} placeholder={template?.definition.name ?? t("Name aus der Vorlage")} onChange={e => setName(e.target.value)} /></label>
    </div>{template ? <section className="creation-instance-preview" aria-label={t("Vorschau der neuen Figur")}><small>{t("So startet deine Figur")}</small><h3>{name.trim() || template.definition.name}</h3><p className="field-help">{t(FIGURENART_LABEL[template.definition.kind])} · {t("Vorlage, Revision {revision}", { revision: template.revision })}</p>
      {pkg ? <dl className="creation-stat-preview">{Object.entries(pkg.fields).slice(0, 6).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{typeof (template.definition.fields[key] ?? field.default) === "boolean" ? (template.definition.fields[key] ?? field.default) ? t("Ja") : t("Nein") : String(template.definition.fields[key] ?? field.default)}</dd></div>)}</dl> : null}
      <p className="field-help">{t("Name, Anfangswerte und Besitz werden für diese Figur übernommen. Danach entwickelst du ihren Bogen unabhängig von der Vorlage weiter.")}</p>
    </section> : null}
    {template && !compatible ? <Notice error>{t("Diese Vorlage verwendet andere Regeln als die Kampagne. Wähle eine passende Vorlage oder passe ihr Regelpaket an.")}{onCreateTemplate ? <Button variant="quiet" onClick={onCreateTemplate}>{t("Figurvorlagen öffnen")}</Button> : null}</Notice> : null}
    {created ? <Notice>{t("„{name}“ wurde erschaffen. Du findest die Figur und ihren Bogen am Tisch.", { name: created })}</Notice> : null}
    {task.error || templates.error ? <Notice error>{task.error || templates.error}</Notice> : null}<div className="creation-save-actions"><Button type="submit" variant="primary" disabled={task.busy || !template || !compatible}>{task.busy ? t("Figur wird erschaffen …") : t("Figur erschaffen")}</Button></div>
  </fieldset></form>;
}
function ActorDetails({ campaignId, current, gm, roster, revision, onChanged, onDirty }: {
  campaignId: string; current: ActorCard; gm: boolean; roster: Member[]; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [baseline, setBaseline] = useState(current), [name, setName] = useState(current.name), [kind, setKind] = useState<ActorKindValue>(current.kind === "unspecified" ? "npc" : current.kind);
  const [lore, setLore] = useState(current.loreEntryId), [reason, setReason] = useState(""), [user, setUser] = useState("");
  const controllers = useResource<ControllerCard[]>(gm ? apiPath(campaignId, `/actors/${current.id}/controllers`) : null, revision);
  const task = useTask(), command = useCommand();
  const dirty = name !== baseline.name || lore !== baseline.loreEntryId || (baseline.kind !== "unspecified" && kind !== baseline.kind) || !!reason;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  const replace = (a: ActorCard) => { setBaseline(a); setName(a.name); setKind(a.kind === "unspecified" ? "npc" : a.kind); setLore(a.loreEntryId); setReason(""); };
  const newer = current.version !== null && baseline.version !== null && current.version > baseline.version;
  useEffect(() => { if (!gm || (!dirty && newer)) replace(current); }, [current, dirty, newer, gm]);
  const controlledBy = [...new Set((controllers.data ?? []).filter(c => c.revokedAt === null).map(c => {
    const m = roster.find(r => r.userId === c.userId); return !m ? t("Ehemaliges Mitglied") : m.role === "leitung" ? t("Spielleitung") : m.displayName;
  }))].join(", ") || t("Spielleitung");
  return <section className="panel actor-details"><h2>{baseline.name}</h2><p className="field-help">{baseline.kind === "unspecified" ? t("Bestehende Figur") : t(FIGURENART_LABEL[baseline.kind])}{baseline.template ? ` · ${t("Vorlage, Revision {revision}", { revision: baseline.template.revision })}` : ` · ${t("Individuelle Figur")}`}</p>
    <p className="field-help">{gm ? t("Gesteuert von: {personen}", { personen: controlledBy }) : t("Du steuerst diese Figur.")}</p>
    {newer ? <Notice>{t("Die Figur wurde inzwischen geändert.")} <Button onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) replace(current); }}>{t("Aktuelle Figur übernehmen")}</Button></Notice> : null}
    {gm ? <><form onSubmit={event => { event.preventDefault(); void task.run(async () => {
      const saved = await command<ActorCard>(apiPath(campaignId, `/actors/${baseline.id}`), { expectedVersion: baseline.version, name, kind, loreEntryId: lore, reason }, "PUT"); replace(saved); onChanged();
    }); }}><fieldset className="actor-command-fields" disabled={task.busy}><label>{t("Figurenname")}<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{t("Art der Figur")}<select value={kind} onChange={e => setKind(e.target.value as ActorKindValue)}>{FIGURENARTEN.map(id => <option key={id} value={id}>{t(FIGURENART_LABEL[id])}</option>)}</select></label>
      <LoreField campaignId={campaignId} value={lore} onChange={setLore} /><Reason value={reason} onChange={setReason} />
      <div className="button-row"><Button type="submit" disabled={task.busy}>{t("Figur speichern")}</Button><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => {
        if (window.confirm(t("Figur archivieren? Neue Handlungen enden; historische Belege bleiben erhalten."))) void task.run(async () => {
          await command(apiPath(campaignId, `/actors/${baseline.id}/archive`), { expectedVersion: baseline.version, reason }); onDirty(false); onChanged();
        });
      }}>{t("Figur archivieren")}</Button></div>
    </fieldset></form><fieldset disabled={task.busy}><legend>{t("Kontrolle vergeben")}</legend><p className="field-help">{t("Verantwortliche können den Bogen bearbeiten, mit dieser Figur handeln und ihren Wissensblick wählen. Ein Zugriff auf bereits vorhandenes Wissen und empfangene Briefe gehört dazu.")}</p>
      <label>{t("Mitglied")}<select value={user} onChange={e => setUser(e.target.value)}><option value="">{t("Mitglied wählen")}</option>{roster.filter(m => m.role !== "beobachter").map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select></label>
      <Button disabled={task.busy || !user || !reason.trim()} onClick={() => void task.run(async () => {
        await command(apiPath(campaignId, `/actors/${baseline.id}/controllers/${user}`), { expectedVersion: controllers.data?.find(c => c.userId === user)?.version ?? 0, reason }, "PUT"); onChanged();
      })}>{t("Kontrolle erlauben")}</Button>
      <ul className="actor-object-list">{controllers.data?.filter(c => c.revokedAt === null).map(c => <li key={c.userId}><span>{roster.find(m => m.userId === c.userId)?.displayName ?? t("Ehemaliges Mitglied")}</span><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => void task.run(async () => {
        await command(apiPath(campaignId, `/actors/${baseline.id}/controllers/${c.userId}/revoke`), { expectedVersion: c.version, reason }); onChanged();
      })}>{t("Kontrolle entziehen")}</Button></li>)}</ul>{controllers.error ? <Notice error>{controllers.error}</Notice> : null}
    </fieldset></> : <p>{t("Deinen Bogen und deine Handlungen findest du in den benachbarten Tischansichten.")}</p>}
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </section>;
}

function ItemTemplateRevisionView({ campaignId, templateId, revisionNumber }: { campaignId: string; templateId: string; revisionNumber: number }) {
  const shown = useResource<TemplateCard<ItemContract>>(apiPath(campaignId, `/item-templates/${encodeURIComponent(templateId)}?revision=${revisionNumber}`));
  const definition = shown.data?.definition;
  return <section className="panel"><h2>{definition?.name ?? t("Revision {nummer}", { nummer: revisionNumber })}</h2>
    <p className="field-help">{t("Frühere Revision, schreibgeschützt. Eine neue Revision entsteht nur, wenn die aktuelle Vorlage überarbeitet wird.")}</p>
    {shown.loading ? <Loading /> : null}{shown.error ? <Notice error>{shown.error}</Notice> : null}
    {definition ? <div className="actor-command-fields">
      <Lootkarte definition={definition} campaignId={campaignId} />
      <p>{t("Etiketten · {etiketten}", { etiketten: definition.tags.length ? definition.tags.join(" · ") : t("Keine") })}</p>
      <fieldset disabled><legend>{t("Verknüpfter Artikel")}</legend><LoreField campaignId={campaignId} value={definition.loreEntryId} onChange={() => {}} /></fieldset>
    </div> : null}
  </section>;
}
export function ItemTemplates({ campaignId, revision, onChanged, onDirty, onOpenInventory }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void; onOpenInventory?: () => void }) {
  const templates = useResource<TemplateCard<ItemContract>[]>(apiPath(campaignId, "/item-templates"), revision);
  const [selected, setSelected] = useState<TemplateCard<ItemContract> | null>(null);
  const [viewRevision, setViewRevision] = useState<number | null>(null);
  const [query, setQuery] = useState(""), [saved, setSaved] = useState(false);
  const { epoch, dirty, report, reset, current } = useTemplateDraft(onDirty);
  const choose = (karte: TemplateCard<ItemContract> | null) => { if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; setSelected(karte); setViewRevision(null); setSaved(false); reset(); };
  const pickRevision = (n: number) => { if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; setViewRevision(n); reset(); };
  const visible = templates.data?.filter(karte => `${karte.definition.name} ${karte.definition.tags.join(" ")}`.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de"))) ?? [];
  return <div className="actor-columns actor-template-workspace"><section className="panel actor-template-library"><h2>{t("Deine Kartenvorlagen")}</h2><p className="field-help">{t("Gestalte eine Karte einmal und erzeuge daraus beliebig viele Exemplare. Bereits vergebene Karten behalten ihre bisherige Fassung.")}</p><Button variant="primary" onClick={() => choose(null)}>{t("Neue Lootkarte")}</Button>
    {templates.data?.length ? <label>{t("Lootkarten suchen")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Name oder Stichwort")} /></label> : null}
    {saved ? <Notice>{t("Die Karte wurde gespeichert.")}{onOpenInventory ? <Button variant="quiet" onClick={onOpenInventory}>{t("Jetzt Exemplar erzeugen")}</Button> : null}</Notice> : null}
    {templates.error ? <Notice error>{templates.error}</Notice> : null}{templates.loading ? <Loading /> : !templates.data?.length ? <p className="field-help">{t("Deine erste Karte beginnt mit einem Namen. Bild, Seltenheit und Beschreibung kannst du direkt im Formular gestalten.")}</p> : !visible.length ? <p className="field-help">{t("Keine Karte zu „{suche}“ gefunden.", { suche: query })}</p> : null}
    <ul className="actor-object-list">{visible.map(karte => <li key={karte.id}><Button aria-pressed={selected?.id === karte.id} onClick={() => choose(karte)}>{karte.definition.name}<small>{t("{angabe} · Revision {revision}", { angabe: karte.definition.schemaVersion === 2 ? seltenheitText(karte.definition.seltenheit) : t("Ohne Kartengesicht"), revision: karte.revision })}</small></Button></li>)}</ul>
    {selected ? <RevisionPicker head={selected.revision} value={viewRevision ?? selected.revision} onChange={pickRevision} /> : null}
  </section>{selected && viewRevision !== null && viewRevision !== selected.revision
    ? <ItemTemplateRevisionView key={`${selected.id}:${viewRevision}`} campaignId={campaignId} templateId={selected.id} revisionNumber={viewRevision} />
    : <ItemTemplateForm key={`${selected?.id ?? "new"}:${epoch}`} campaignId={campaignId} original={selected} onDirty={report} onSaved={(archived) => { if (current()) { setSelected(null); setViewRevision(null); reset(); setSaved(!archived); } onChanged(); }} />}</div>;
}
function ItemTemplateForm({ campaignId, original, onDirty, onSaved }: { campaignId: string; original: TemplateCard<ItemContract> | null; onDirty: (value: boolean) => void; onSaved: (archived?: boolean) => void }) {
  const vorher = original?.definition, gesicht = vorher?.schemaVersion === 2 ? vorher : null;
  const [name, setName] = useState(vorher?.name ?? ""), [tags, setTags] = useState(vorher?.tags.join(", ") ?? ""), [lore, setLore] = useState(vorher?.loreEntryId ?? null), [reason, setReason] = useState("");
  const [seltenheit, setSeltenheit] = useState<LootRarityValue>(gesicht?.seltenheit ?? "gewoehnlich");
  const [kategorie, setKategorie] = useState(gesicht?.kategorie ?? ""), [spruch, setSpruch] = useState(gesicht?.spruch ?? "");
  const [bild, setBild] = useState<string | null>(gesicht?.bildAssetId ?? null);
  const [zeilen, setZeilen] = useState<{ label: string; wert: string }[]>(gesicht ? gesicht.zeilen.map(z => ({ ...z })) : []);
  const [mediaOpen, setMediaOpen] = useState(false), [mediaRevision, setMediaRevision] = useState(0);
  const [formDirty, setFormDirty] = useState(false), [mediaDirty, setMediaDirty] = useState(false);
  const bestand = useResource<WikiMedienBestand>(apiPath(campaignId, "/wiki-medien"), mediaRevision);
  const task = useTask(), command = useCommand();
  useEffect(() => { onDirty(formDirty || mediaDirty); }, [formDirty, mediaDirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const fertigeZeilen = zeilen.filter(z => z.label.trim() && z.wert.trim()).map(z => ({ label: z.label.trim(), wert: z.wert.trim() }));
  const incompleteRows = zeilen.some(z => Boolean(z.label.trim()) !== Boolean(z.wert.trim()));
  const entwurf: ItemContract = { schemaVersion: 2, name: name.trim() || t("Deine Lootkarte"), loreEntryId: lore,
    tags: [...new Set(tags.split(",").map(t => t.trim()).filter(Boolean))],
    seltenheit, kategorie: kategorie.trim(), bildAssetId: bild, spruch: spruch.trim(), zeilen: fertigeZeilen };
  const setzeZeile = (i: number, teil: Partial<{ label: string; wert: string }>) => { setZeilen(alt => alt.map((z, n) => n === i ? { ...z, ...teil } : z)); setFormDirty(true); };
  // Opening the existing media library keeps this component and its card draft alive.
  if (mediaOpen) return <section className="loot-media-editor"><p className="field-help">{t("Dein Kartenentwurf bleibt erhalten. Nach dem Hochladen kannst du das Bild auf deiner Karte auswählen.")}</p><WikiMedien campaignId={campaignId} embedded closeLabel={t("Zurück zur Lootkarte")} onDirty={setMediaDirty} onClose={() => {
    if (mediaDirty && !window.confirm(t("Ausgewählte, noch nicht hochgeladene Datei verwerfen?"))) return;
    setMediaOpen(false); setMediaDirty(false); setMediaRevision(value => value + 1);
  }} /></section>;
  return <div className="loot-editor-layout"><form className="panel loot-template-form" onChange={() => setFormDirty(true)} onSubmit={event => { event.preventDefault(); if (incompleteRows || !name.trim()) return; void task.run(async () => {
    await command(apiPath(campaignId, `/item-templates${original ? `/${original.id}` : ""}`), { definition: entwurf, ...(original ? { expectedVersion: original.version, reason } : {}) }, original ? "PUT" : "POST"); setFormDirty(false); onDirty(false); onSaved();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{original ? t("Lootkarte überarbeiten") : t("Lootkarte erstellen")}</h2>
    <p className="field-help">{t("Ein Name genügt für den Anfang. Die Vorschau zeigt jede Änderung sofort.")}</p>
    <label>{t("Gegenstandsname")}<input required maxLength={160} value={name} placeholder={t("z. B. Trank der Morgenröte")} onChange={e => setName(e.target.value)} /></label>
    <div className="loot-basic-fields">
      <label>{t("Art des Gegenstands")}<input value={kategorie} maxLength={80} placeholder={t("z. B. Werkzeug, Waffe, Trank")} onChange={e => setKategorie(e.target.value)} /></label>
      <label>{t("Seltenheit")}<select value={seltenheit} onChange={e => setSeltenheit(e.target.value as LootRarityValue)}>
        {LOOT_RARITIES.map(stufe => <option key={stufe} value={stufe}>{seltenheitText(stufe)}</option>)}</select></label>
    </div>
    <label>{t("Kartenbild")}<select value={bild ?? ""} onChange={e => setBild(e.target.value || null)}>
      <option value="">{t("Ohne Bild")}</option>
      {bestand.data?.assets.filter(asset => asset.vorhanden || asset.id === gesicht?.bildAssetId)
        .map(asset => <option key={asset.id} value={asset.id}>{asset.dateiname}{asset.vorhanden ? "" : ` — ${t("Datei fehlt")}`}</option>)}</select></label>
    <Button variant="quiet" onClick={() => setMediaOpen(true)}>{t("Bild hochladen oder Bestand öffnen")}</Button>
    {bestand.error ? <Notice error>{bestand.error}</Notice> : null}
    {bestand.data && !bestand.data.assets.some(asset => asset.vorhanden) ? <p className="field-help">{t("Noch kein Bild vorhanden. Du kannst jetzt eines hochladen oder die Karte zunächst ohne Bild speichern.")}</p> : null}
    <label>{t("Beschreibung auf der Karte")}<textarea value={spruch} maxLength={600} rows={3} placeholder={t("Was macht diesen Gegenstand besonders?")} onChange={e => setSpruch(e.target.value)} /></label>
    <details className="actor-optional" open={zeilen.length > 0}><summary>{t("Werte auf der Karte · optional")}</summary><fieldset className="sheet-section"><legend>{t("Eigenschaften und Werte")}</legend>
      <p className="field-help">{t("Zum Beispiel „Heilung: 2W6“ oder „Gewicht: 1 kg“. Diese Angaben stehen auf der Karte; sie lösen keine automatischen Würfelmodifikatoren aus.")}</p>
      {zeilen.map((zeile, i) => <div className="loot-value-row" key={i}>
        <label>{t("Bezeichnung")}<input value={zeile.label} maxLength={40} onChange={e => setzeZeile(i, { label: e.target.value })} /></label>
        <label>{t("Wert")}<input value={zeile.wert} maxLength={120} onChange={e => setzeZeile(i, { wert: e.target.value })} /></label>
        <Button aria-label={t("Zeile {nummer} entfernen", { nummer: i + 1 })} onClick={() => { setZeilen(alt => alt.filter((_, n) => n !== i)); setFormDirty(true); }}>{t("Entfernen")}</Button>
      </div>)}
      {zeilen.length < 8 ? <Button onClick={() => { setZeilen(alt => [...alt, { label: "", wert: "" }]); setFormDirty(true); }}>{t("Zeile hinzufügen")}</Button> : <p className="field-help">{t("Bis zu acht Werte passen auf die Karte.")}</p>}
      {incompleteRows ? <p className="field-help" role="status">{t("Ergänze in jeder begonnenen Zeile Bezeichnung und Wert oder entferne die Zeile.")}</p> : null}
    </fieldset></details>
    <details className="actor-optional" open={!!tags || !!lore}><summary>{t("Stichwörter & Artikel · optional")}</summary>
      <label>{t("Etiketten, durch Komma getrennt")}<input value={tags} maxLength={2592} placeholder={t("z. B. Heilung, Alchemie")} onChange={e => setTags(e.target.value)} /></label><LoreField campaignId={campaignId} value={lore} onChange={setLore} />
    </details>
    {original ? <><p className="field-help">{t("Du speicherst eine neue Fassung. Bereits erzeugte Exemplare behalten ihre bisherige Karte.")}</p><Reason value={reason} onChange={setReason} /></> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <div className="loot-save-actions"><Button type="submit" variant="primary" disabled={task.busy || !name.trim() || incompleteRows}>{task.busy ? t("Wird gespeichert …") : original ? t("Neue Fassung speichern") : t("Lootkarte speichern")}</Button></div>
    {original ? <details className="actor-optional"><summary>{t("Vorlage archivieren")}</summary><p className="field-help">{t("Vorhandene Gegenstände und frühere Fassungen bleiben erhalten.")}</p><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => { if (window.confirm(t("Gegenstandsvorlage archivieren? Vorhandene Gegenstände bleiben erhalten."))) void task.run(async () => {
      await command(apiPath(campaignId, `/item-templates/${original.id}/archive`), { expectedVersion: original.version, reason }); setFormDirty(false); onDirty(false); onSaved(true);
    }); }}>{t("Gegenstandsvorlage archivieren")}</Button></details> : null}
  </fieldset></form><aside className="loot-live-preview" aria-label={t("Live-Vorschau der Lootkarte")}><h3>{t("Deine Karte")}</h3><p className="field-help">{t("Vorschau · noch nicht gespeichert")}</p><Lootkarte definition={entwurf} campaignId={campaignId} /><p className="field-help">{t("Nach dem Speichern findest du die Vorlage in deiner Sammlung. Unter „Exemplare & Vorrat“ wird daraus Beute für deine Runde.")}</p></aside></div>;
}

export function Inventory({ campaignId, actorId, actors, gm, revision, onChanged, onDirty, onCreateTemplate }: { campaignId: string; actorId: string; actors: ActorCard[]; gm: boolean; revision: number; onChanged: () => void; onDirty: (value: boolean) => void; onCreateTemplate?: () => void }) {
  // Welches Inventar gerade offen ist: "" ist der Vorrat der Spielleitung, sonst eine Figur —
  // und eine Figur kann auch ein Behaelter sein. Eine Kutsche haelt Dinge wie jede andere Figur;
  // eine eigene Behaeltertabelle waere eine Doppelung, und die Figurenarten stehen ohnehin im
  // eingefrorenen Exportprofil.
  const [gewaehlt, setGewaehlt] = useState(actorId), [selected, setSelected] = useState(""), [dirtyParts, setDirtyParts] = useState({ item: false, money: false });
  const dirty = dirtyParts.item || dirtyParts.money;
  const report = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, item: value })), []);
  const reportMoney = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, money: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  // Wechselt die handelnde Figur am Tisch, folgt das Inventar — danach darf man frei blaettern.
  useEffect(() => { setGewaehlt(actorId); setSelected(""); }, [actorId]);
  const stock = gewaehlt === "";
  const holder = stock ? null : gewaehlt;
  const items = useResource<ItemCard[]>(stock ? (gm ? apiPath(campaignId, "/items") : null) : apiPath(campaignId, `/actors/${encodeURIComponent(gewaehlt)}/items`), revision);
  const filtered = items.data?.filter(i => i.holderActorId === holder) ?? [];
  const chosen = filtered.find(i => i.id === selected);
  const templates = useResource<TemplateCard<ItemContract>[]>(gm ? apiPath(campaignId, "/item-templates") : null, revision);
  const [templateId, setTemplateId] = useState(""); const task = useTask(), command = useCommand();
  const offen = actors.find(a => a.id === gewaehlt);
  const figuren = actors.filter(a => a.kind === "player_character");
  const weitere = actors.filter(a => a.kind !== "player_character");
  const waehle = (wert: string) => { if (wert === gewaehlt) return; if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; setGewaehlt(wert); setSelected(""); setDirtyParts({ item: false, money: false }); };
  return <section className="inventory-section"><div className="page-heading"><h2>{stock ? t("Vorrat der Spielleitung") : offen ? t("Inventar · {name}", { name: offen.name }) : t("Inventar")}</h2>
      {/* Verschiedene Inventare an einer Stelle: der Vorrat, die Figuren, und alles andere, das
          Dinge traegt — Begleitung, Kreatur, Fahrzeug. Wer die Kutsche nicht fuehrt, sieht sie
          hier gar nicht erst, denn die Liste zeigt nur, was der Zugang ohnehin hergibt. */}
      <label className="inventar-wahl">{t("Inventar")}<select value={gewaehlt} onChange={e => waehle(e.target.value)}>
        {gm ? <option value="">{t("Vorrat der Spielleitung")}</option> : null}
        {figuren.length ? <optgroup label={t("Figuren")}>{figuren.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup> : null}
        {weitere.length ? <optgroup label={t("Behälter und Begleitung")}>{weitere.map(a => <option key={a.id} value={a.id}>{a.name}{a.kind === "vehicle" ? ` · ${t("Fahrzeug")}` : ""}</option>)}</optgroup> : null}
      </select></label></div>
    {items.error || task.error ? <Notice error>{items.error || task.error}</Notice> : null}
    {/* Der Vorrat allein zeigt nur den Tresor. Der Speicherstand beantwortet die andere Frage:
        wo ist der Loot? Er rechnet aus der Liste, die hier ohnehin schon geholt wurde. */}
    {gm && stock ? <Speicherstand items={items.data ?? []} actors={actors} /> : null}
    {/* Geld gehoert der Figur, nicht dem Behaelter: im Vorrat der Spielleitung steht keins. */}
    {!stock ? <Geldzaehler key={gewaehlt} campaignId={campaignId} actorId={gewaehlt} gm={gm} revision={revision} onChanged={onChanged} onDirty={reportMoney} /> : null}
    {/* Beute uebernehmen. Der Wolf traegt sein Fell, seit er erschaffen wurde — am Tisch fehlte
        der kurze Weg dorthin: jeder Gegenstand musste einzeln umgehaengt werden. Hier steht kein
        zweiter Besitzweg, sondern derselbe `custody`-Befehl, nur mehrfach. */}
    {gm && filtered.length ? <Beuteuebergabe campaignId={campaignId} items={filtered} quelle={holder} actors={actors}
      busy={task.busy || dirtyParts.item} onChanged={() => { setSelected(""); onChanged(); }} /> : null}
    {gm && !templates.loading && !templates.error && !templates.data?.length ? <div className="panel actor-empty-hint"><h3>{t("Zuerst eine Lootkarte gestalten")}</h3><p>{t("Speichere eine Kartenvorlage in der Schmiede. Danach kannst du hier ein Exemplar in den Vorrat oder in ein Figureninventar legen.")}</p>{onCreateTemplate ? <Button variant="primary" onClick={onCreateTemplate}>{t("Lootkarte erstellen")}</Button> : null}</div> : null}
    {gm && templates.data?.length ? <form className="panel inventory-create" onSubmit={event => { event.preventDefault(); if (dirtyParts.item && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; const karte = templates.data?.find(eintrag => eintrag.id === templateId); if (karte) void task.run(async () => {
      const item = await command<ItemCard>(apiPath(campaignId, "/items/instantiate"), { templateId: karte.id, templateRevision: karte.revision, holderActorId: holder }); setSelected(item.id); onChanged();
    }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h3>{t("Ein Exemplar erzeugen")}</h3><p className="field-help">{t("Das Exemplar erhält eine eigene Menge, Notizen und einen Besitzer. Du kannst dieselbe Vorlage mehrfach verwenden.")}</p><label>{t("Gegenstand aus Vorlage")}<select required value={templateId} onChange={e => setTemplateId(e.target.value)}><option value="">{t("Kartenvorlage wählen")}</option>{templates.data?.map(karte => <option key={karte.id} value={karte.id}>{t("{angabe} · Revision {revision}", { angabe: karte.definition.name, revision: karte.revision })}</option>)}</select></label>{/* Gelegt wird in das Inventar, das gerade offen ist — Vorrat, Figur oder Behälter. Die
          alte Sperre fragte noch die handelnde Figur ab und haette beim Blaettern in einer
          Kutsche fälschlich blockiert. */}
      <Button type="submit" variant="primary" disabled={task.busy || !templateId}>{t("Gegenstand hinzufügen")}</Button>{onCreateTemplate ? <Button variant="quiet" onClick={onCreateTemplate}>{t("Neue Lootkarte gestalten")}</Button> : null}</fieldset></form> : null}
    {templates.error ? <Notice error>{templates.error}</Notice> : null}
    <div className="actor-columns"><div>{items.loading ? <Loading /> : filtered.length ? <ul className="lootkarten-reihe lootkarten-wahl">{filtered.map(i => <li key={i.id}>
      {/* Der Bestand liest sich als Kartenblatt. Menge und Ausruestung stehen daneben: sie
          gehoeren zur INSTANZ, nicht zum Kartengesicht der Vorlage. */}
      <button type="button" aria-pressed={selected === i.id} className={selected === i.id ? "lootkarte-wahl gewaehlt" : "lootkarte-wahl"}
        onClick={() => { if (selected === i.id) return; if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) { setSelected(i.id); report(false); } }}>
        <Lootkarte definition={i.definition} campaignId={campaignId} klein />
        <span className="lootkarte-instanz">{i.state.quantity}×{i.state.equipped ? ` · ${t("Ausgerüstet")}` : ""}</span>
      </button></li>)}</ul> : <p className="muted">{t("Hier liegen noch keine Gegenstände.")}</p>}</div>
      {chosen ? <fieldset className="actor-command-fields" disabled={task.busy}><ItemEditor key={chosen.id} campaignId={campaignId} current={chosen} actors={actors} gm={gm} onDirty={report} onChanged={onChanged} /></fieldset> : null}</div>
  </section>;
}
/**
 * Beute übernehmen — ein Ziel, ein Klick, und ein ehrlicher Bericht.
 *
 * Jeder Posten geht einzeln durch denselben `custody`-Befehl wie eine Einzelübergabe: dieselbe
 * erwartete Version, derselbe Beleg im Prüfprotokoll. Ein eigener Sammelbefehl hätte eine neue
 * Vorgangsart gebraucht — die steht als `CHECK` in der Datenbank und im eingefrorenen
 * Exportprofil, und ein Wort mehr dort bricht jeden Export (Feature 8).
 *
 * **Ein Fehlschlag pro Stück ist kein Fehlschlag des Zuges.** Wird ein Gegenstand nebenher
 * verändert, scheitert genau er — der Rest kommt an, und was nicht ankam, steht mit Grund da.
 */
function Beuteuebergabe({ campaignId, items, quelle, actors, busy, onChanged }: {
  campaignId: string; items: ItemCard[]; quelle: string | null; actors: ActorCard[]; busy: boolean; onChanged: () => void;
}) {
  const VORRAT = "__vorrat";
  const [wahl, setWahl] = useState("");
  const [bericht, setBericht] = useState<{ uebergeben: number; fehler: { name: string; grund: string }[] } | null>(null);
  const task = useTask(), command = useCommand();
  const ziel = wahl === VORRAT ? null : wahl || "";
  const plan = wahl ? uebergabeplan(items, ziel) : [];
  const zielName = wahl === VORRAT ? t("den Vorrat der Spielleitung") : actors.find(a => a.id === wahl)?.name ?? "";

  const uebergib = () => task.run(async () => {
    const fehler: { name: string; grund: string }[] = [];
    let uebergeben = 0;
    for (const posten of plan) {
      try {
        await command(apiPath(campaignId, `/items/${encodeURIComponent(posten.id)}/custody`),
          { expectedVersion: posten.expectedVersion, holderActorId: ziel, reason: "Beute übernommen" });
        uebergeben += 1;
      } catch (error) { fehler.push({ name: posten.name, grund: errorText(error) }); }
    }
    setBericht({ uebergeben, fehler });
    setWahl("");
    onChanged();
  });

  return <section className="panel beute-uebergabe">
    <div className="section-heading"><h3><PackageOpen size={17} /> {t("Beute übernehmen")}</h3></div>
    <p className="field-help">{t("Übergibt alles aus diesem Inventar auf einmal — was am Ziel schon liegt, bleibt unangetastet.")}</p>
    <div className="button-row">
      <label className="inventar-wahl">{t("Ziel")}<select value={wahl} disabled={busy || task.busy} onChange={event => { setWahl(event.target.value); setBericht(null); }}>
        <option value="">{t("Wohin?")}</option>
        {quelle !== null ? <option value={VORRAT}>{t("Vorrat der Spielleitung")}</option> : null}
        {actors.filter(actor => actor.id !== quelle).map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
      </select></label>
      <Button variant="primary" disabled={busy || task.busy || !plan.length} onClick={() => void uebergib()}>
        {plan.length ? plural(plan.length, "{n} Stück an {ziel} übergeben", "{n} Stücke an {ziel} übergeben", { ziel: zielName }) : t("Nichts zu übergeben")}
      </Button>
    </div>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    {bericht ? <Notice error={bericht.fehler.length > 0}>
      {plural(bericht.uebergeben, "{n} Stück übergeben", "{n} Stücke übergeben")}{bericht.fehler.length ? t(", {anzahl} nicht:", { anzahl: bericht.fehler.length }) : "."}
      {bericht.fehler.length ? <ul>{bericht.fehler.map(zeile => <li key={zeile.name}>{zeile.name} — {zeile.grund}</li>)}</ul> : null}
    </Notice> : null}
  </section>;
}

/** Der Speicherstand als Tafel: erst die Summen, dann jede Karte mit ihrem Verbleib. */
function Speicherstand({ items, actors }: { items: ItemCard[]; actors: ActorCard[] }) {
  const stand = speicherstats(items, actors);
  if (!stand.vorlagen) return <p className="muted">{t("Noch ist nichts im Bestand.")}</p>;
  return <section className="panel speicherstand">
    <h3>{t("Speicherstand")}</h3>
    <p className="field-help">{t("{vorlagen} Vorlagen · {karten} Karten · {stuecke} Stücke — davon {imVorrat} im Vorrat und {vergeben} vergeben.",
      { vorlagen: stand.vorlagen, karten: stand.karten, stuecke: stand.stuecke, imVorrat: stand.imVorratStuecke, vergeben: stand.vergebeneStuecke })}</p>
    <div className="speicherstand-tafel"><table>
      <thead><tr><th scope="col">{t("Lootkarte")}</th><th scope="col">{t("Im Vorrat")}</th><th scope="col">{t("Vergeben an")}</th><th scope="col">{t("Gesamt")}</th></tr></thead>
      <tbody>{stand.zeilen.map(zeile => <tr key={zeile.templateId}>
        <th scope="row">{zeile.name}{zeile.seltenheit ? <small> · {seltenheitText(zeile.seltenheit)}</small> : null}</th>
        <td>{zeile.imVorratStuecke}</td>
        <td>{zeile.vergeben.length
          ? zeile.vergeben.map(v => `${v.name} (${v.stuecke})`).join(", ")
          : <span className="muted">{t("niemandem")}</span>}</td>
        <td>{zeile.stuecke}{zeile.karten !== zeile.stuecke ? <small> {t("in {karten} Karten", { karten: zeile.karten })}</small> : null}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function ItemEditor({ campaignId, current, actors, gm, onDirty, onChanged }: { campaignId: string; current: ItemCard; actors: ActorCard[]; gm: boolean; onDirty: (value: boolean) => void; onChanged: () => void }) {
  const [baseline, setBaseline] = useState(current), [state, setState] = useState<ItemState>(current.state), [holder, setHolder] = useState(current.holderActorId ?? ""), [reason, setReason] = useState("");
  const task = useTask(), command = useCommand();
  const dirty = JSON.stringify(state) !== JSON.stringify(baseline.state) || holder !== (baseline.holderActorId ?? "") || !!reason;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  const replace = (item: ItemCard) => { setBaseline(item); setState(item.state); setHolder(item.holderActorId ?? ""); setReason(""); };
  useEffect(() => { if (!dirty && current.version > baseline.version) replace(current); }, [current, dirty, baseline.version]);
  return <form className="panel" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    const saved = await command<ItemCard>(apiPath(campaignId, `/items/${baseline.id}`), { expectedVersion: baseline.version, state, reason }, "PUT"); replace(saved); onChanged();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h3>{baseline.definition.name}</h3><p className="field-help">{t("Vorlagenrevision {revision} · {etiketten}", { revision: baseline.template.revision, etiketten: baseline.definition.tags.join(" · ") })}</p>
    <Lootkarte definition={baseline.definition} campaignId={campaignId} />
    {current.version > baseline.version ? <Notice>{t("Der Gegenstand wurde inzwischen geändert.")} <Button onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) replace(current); }}>{t("Aktuellen Gegenstand übernehmen")}</Button></Notice> : null}
    <label>{t("Menge")}<input type="number" min={1} max={1_000_000} step={1} required value={state.quantity} onChange={e => setState(s => ({ ...s, quantity: e.target.valueAsNumber }))} /></label>
    <label>{t("Notizen")}<textarea maxLength={4000} value={state.notes} onChange={e => setState(s => ({ ...s, notes: e.target.value }))} /></label>
    <label className="check-label"><input type="checkbox" checked={state.equipped} onChange={e => setState(s => ({ ...s, equipped: e.target.checked }))} /> {t("Ausgerüstet")}</label><Reason value={reason} onChange={setReason} />
    {task.error ? <Notice error>{task.error}</Notice> : null}<Button type="submit" disabled={task.busy}>{t("Gegenstand speichern")}</Button>
    {gm ? <fieldset><legend>{t("Besitz zuordnen")}</legend><label>{t("Träger")}<select value={holder} onChange={e => setHolder(e.target.value)}><option value="">{t("Vorrat der Spielleitung")}</option>{actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <p className="field-help">{t("Die Zuordnung überträgt den gespeicherten Gegenstand. Ungespeicherte Änderungen zuerst speichern.")}</p>
      <Button disabled={task.busy || !reason.trim() || JSON.stringify(state) !== JSON.stringify(baseline.state)} onClick={() => void task.run(async () => {
        const saved = await command<ItemCard>(apiPath(campaignId, `/items/${baseline.id}/custody`), { expectedVersion: baseline.version, holderActorId: holder || null, reason }); replace(saved); onChanged();
      })}>{t("Besitz übertragen")}</Button><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => { if (window.confirm(t("Gegenstand archivieren? Sein bisheriger Verlauf bleibt erhalten."))) void task.run(async () => {
        await command(apiPath(campaignId, `/items/${baseline.id}/archive`), { expectedVersion: baseline.version, reason }); onDirty(false); onChanged();
      }); }}>{t("Gegenstand archivieren")}</Button>
    </fieldset> : null}
  </fieldset></form>;
}
