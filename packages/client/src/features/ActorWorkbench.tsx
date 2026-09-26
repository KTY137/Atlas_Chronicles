// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard, ActorKindValue, ActorTemplateData, ControllerCard, FigurantragCard, TemplateCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice, TabPanel, Tabs, confirmAction } from "@chronicle/ui";
import { api, apiPath, type EntrySummary, type Member } from "../api";
import { t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand, type RulesState } from "./game-api";
import type { ForgeSection } from "./forge-navigation";
import { ActorTemplates as HostActorTemplates } from "./ActorTemplatesHost";
import { InstantiateActor as HostInstantiateActor } from "./InstantiateActorHost";
import { Inventory, ItemTemplates } from "./ActorInventoryWorkbench";
import { reasonOrDefault } from "./figuren-gruende";
import "./actors.css";
import "./character-creation.css";

export { Inventory, ItemTemplates } from "./ActorInventoryWorkbench";
export { ActorTemplates } from "./ActorTemplatesHost";
export { InstantiateActor } from "./InstantiateActorHost";

const FIGURENART_LABEL: Record<ActorKindValue, string> = {
  player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug",
};
const FIGURENARTEN = Object.keys(FIGURENART_LABEL) as ActorKindValue[];
type View = "actors" | "templates" | "item-templates" | "antraege";
const verwerfenFrage = () => confirmAction({ title: t("Ungespeicherte Änderungen verwerfen?"), message: t("Was du hier geändert und noch nicht gespeichert hast, geht verloren."), confirmLabel: t("Verwerfen"), cancelLabel: t("Weiter bearbeiten"), danger: true });

/** Canonical workbench: all rule-bound template/instantiate paths use the host runtime. */
export function ActorWorkbench({ campaignId, gm, actorId, actors, roster, rules, revision, onChanged, onDirty, onOpenForge }: {
  campaignId: string; gm: boolean; actorId: string; actors: ActorCard[]; roster: Member[]; rules: RulesState;
  revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void; onOpenForge?: (section: ForgeSection) => void;
}) {
  const [view, setView] = useState<View>("actors");
  const [dirtyParts, setDirtyParts] = useState({ details: false, inventory: false, templates: false, creation: false });
  const dirty = Object.values(dirtyParts).some(Boolean);
  const reportDetails = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, details: value })), []);
  const reportInventory = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, inventory: value })), []);
  const reportTemplates = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, templates: value })), []);
  const reportCreation = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, creation: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  // Die offenen Anträge laden hier, nicht erst im Reiter: der Reiter zeigt ihre Zahl.
  const antraege = useResource<FigurantragCard[]>(gm ? apiPath(campaignId, "/figurantraege") : null, revision);
  const offen = antraege.data?.length ?? 0;
  // Die Zahl am Reiter ist sichtbar; vorgelesen wird sie als Satzteil („Anträge, 2 offen“), nicht als „Anträge2“.
  const zaehler = offen ? <><span aria-hidden="true">{offen}</span><span className="sr-only">{t(", {anzahl} offen", { anzahl: offen })}</span></> : undefined;
  const selected = actors.find(actor => actor.id === actorId);
  const createSelect = useRef<HTMLSelectElement>(null);
  const chooseView = async (next: string) => {
    if (view === next) return;
    if (dirty && !await verwerfenFrage()) return;
    setView(next as View); setDirtyParts({ details: false, inventory: false, templates: false, creation: false });
  };
  const tabs = onOpenForge
    ? [{ id: "actors", label: t("Figuren & Besitz") }, { id: "antraege", label: t("Anträge"), badge: zaehler }]
    : [{ id: "actors", label: t("Figuren & Besitz") }, { id: "templates", label: t("Figurvorlagen") }, { id: "item-templates", label: t("Lootkarten") }, { id: "antraege", label: t("Anträge"), badge: zaehler }];
  const inhalt = view === "antraege" && gm ? <Figurantraege campaignId={campaignId} rules={rules} antraege={antraege} revision={revision} onChanged={onChanged} />
    : view === "templates" && gm ? <HostActorTemplates campaignId={campaignId} rules={rules} revision={revision} onChanged={onChanged} onDirty={reportTemplates} />
    : view === "item-templates" && gm ? <ItemTemplates campaignId={campaignId} revision={revision} onChanged={onChanged} onDirty={reportTemplates} />
    : <><div className="actor-columns">{selected ? <ActorDetails key={selected.id} campaignId={campaignId} current={selected} gm={gm} roster={roster} revision={revision} onChanged={onChanged} onDirty={reportDetails} />
        : gm && !actors.length ? <EmptyState title={t("Noch keine Figur in eurer Runde.")} action={<Button variant="quiet" onClick={() => createSelect.current?.focus()}>{t("Zum Formular „Figur anlegen“")}</Button>}>
          {t("Es gibt drei Wege zu einer Figur: Mitspieler beantragen eine unter „Ich“, und du gibst sie unter „Anträge“ frei. Oder du legst sie selbst an, aus einer eigenen Figurvorlage oder direkt mit der Beispielfigur deines Regelwerks.")}</EmptyState>
        : gm ? <EmptyState title={t("Noch keine Figur ausgewählt.")}>{t("Wähle oben eine Figur, um ihre Angaben, ihre Kontrolle und ihren Besitz zu sehen. Eine neue Figur legst du nebenan an.")}</EmptyState>
        : <EmptyState title={t("Noch keine Figur ausgewählt.")}>{t("Die Spielleitung legt Figuren an. Deine eigene Figur kannst du unter „Ich“ beantragen.")}</EmptyState>}
        {gm ? <HostInstantiateActor campaignId={campaignId} rules={rules} revision={revision} onChanged={onChanged} selectRef={createSelect} onDirty={reportCreation} onCreateTemplate={onOpenForge ? () => onOpenForge("actors") : () => void chooseView("templates")} /> : null}</div>
        <Inventory key={`${actorId}:${gm}`} campaignId={campaignId} actorId={actorId} actors={actors} gm={gm} leise revision={revision} onChanged={onChanged} onDirty={reportInventory} onCreateTemplate={gm && onOpenForge ? () => onOpenForge("loot") : undefined} />
      </>;
  return <div className="actor-workbench">
    {gm && onOpenForge ? <aside className="actor-forge-entry"><div><strong>{t("Figurvorlagen und Lootkarten entstehen in der Schmiede.")}</strong><p className="field-help">{t("Hier verwaltest du eure Figuren, ihren Besitz und die Anträge deiner Mitspieler.")}</p></div><div className="button-row"><Button onClick={() => onOpenForge("actors")}>{t("Figurvorlagen")}</Button><Button onClick={() => onOpenForge("loot")}>{t("Lootkarten erstellen")}</Button></div></aside> : null}
    {gm ? <><Tabs label={t("Figurenverwaltung")} idPrefix="figurenverwaltung" items={tabs} value={view} onChange={next => void chooseView(next)} />
      <TabPanel idPrefix="figurenverwaltung" id={view} className="actor-workbench-panel">{inhalt}</TabPanel></> : inhalt}
  </div>;
}

/** GM review labels deltas with the exact package pinned into the requested template revision. */
function Figurantraege({ campaignId, rules, antraege: list, revision, onChanged }: {
  campaignId: string; rules: RulesState; antraege: { data: FigurantragCard[] | null; loading: boolean; error: string }; revision: number; onChanged: () => void;
}) {
  const vorlagen = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [gruende, setGruende] = useState<Record<string, string>>({});
  const task = useTask(), [konflikt, setKonflikt] = useState(false);
  const packageFor = (antrag: FigurantragCard) => { const pin = antrag.package ?? rules.pin; return rules.packages.find(pkg => pkg.id === pin.id && pkg.version === pin.version); };
  const feldname = (antrag: FigurantragCard, key: string) => packageFor(antrag)?.fields[key]?.label ?? key;
  const grund = (id: string) => gruende[id] ?? "";
  const entscheide = (antrag: FigurantragCard, weg: "bestaetigen" | "ablehnen") => void task.run(async () => {
    setKonflikt(false);
    try { await api(apiPath(campaignId, `/figurantraege/${encodeURIComponent(antrag.id)}/${weg}`), { method: "POST", body: weg === "ablehnen" ? { expectedVersion: antrag.version, reason: grund(antrag.id).trim() } : { expectedVersion: antrag.version } }); }
    catch (error) { if ((error as { status?: number }).status === 409) setKonflikt(true); throw error; }
    setGruende(old => { const next = { ...old }; delete next[antrag.id]; return next; }); onChanged();
  });
  return <section className="panel"><h2>{t("Anträge auf eine Figur")}</h2><p className="field-help">{t("Bestätigst du, entsteht die Figur aus der beantragten Vorlage und gehört der Person, die sie beantragt hat. Lehnst du ab, sieht sie deinen Grund.")}</p>
    {list.error || vorlagen.error ? <Notice error>{list.error || vorlagen.error}</Notice> : null}
    {task.error ? <><Notice error>{konflikt ? `${task.error} ${t("Der Antrag wurde inzwischen geändert.")}` : task.error}</Notice><Button onClick={onChanged}>{t("Anträge neu laden")}</Button></> : null}
    {list.loading && !list.data ? <Loading /> : !list.data?.length ? <p className="field-help">{t("Zurzeit wartet kein Antrag auf eine Entscheidung. Mitspieler beantragen eine Figur unter „Ich“, sobald du eine Figurvorlage für Spieler freigibst.")}</p> : null}
    <ul className="actor-object-list figurantrag-karten">{list.data?.map((antrag, index) => {
      const pkg = packageFor(antrag), hinweis = `figurantrag-${antrag.id}-grund-hinweis`;
      return <li key={antrag.id} className="figurantrag-karte"><strong>{antrag.name}</strong>
        <p className="field-help">{t("Vorlage „{vorlage}“, Fassung {nummer}", { vorlage: vorlagen.data?.find(row => row.id === antrag.templateId)?.definition.name ?? t("unbekannt"), nummer: antrag.templateRevision })}
          {antrag.package ? ` · ${t("{name}, Version {version}", { name: pkg?.name ?? antrag.package.id, version: antrag.package.version })}` : ""}</p>
        {Object.keys(antrag.anfangswerte).length ? <><p className="field-help">{t("Gewünschte Werte:")}</p><ul className="figurantrag-werte">{Object.entries(antrag.anfangswerte).map(([key, value]) => <li key={key}>{feldname(antrag, key)} · {String(value)}</li>)}</ul></> : <p className="field-help">{t("Ohne Abweichung — die Werte der Vorlage bleiben, wie sie sind.")}</p>}
        <div className="button-row"><Button variant={index === 0 ? "primary" : "default"} disabled={task.busy} onClick={() => entscheide(antrag, "bestaetigen")}>{t("Bestätigen")}</Button></div>
        <div className="figurantrag-ablehnen">
          <label>{t("Grund der Ablehnung")}<input maxLength={500} value={grund(antrag.id)} aria-describedby={hinweis} onChange={event => { const value = event.target.value; setGruende(old => ({ ...old, [antrag.id]: value })); }} /></label>
          <p id={hinweis} className="field-help">{t("Pflicht zum Ablehnen: die Person sieht diesen Grund.")}</p>
          <Button variant="danger" disabled={task.busy || !grund(antrag.id).trim()} aria-describedby={hinweis} onClick={() => entscheide(antrag, "ablehnen")}>{t("Ablehnen")}</Button>
        </div>
      </li>;
    })}</ul>
  </section>;
}

function LoreField({ campaignId, value, onChange }: { campaignId: string; value: string | null; onChange: (value: string | null) => void }) {
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  return <label>{t("Artikel zur Figur oder zum Gegenstand")}<select value={value ?? ""} onChange={event => onChange(event.target.value || null)}><option value="">{t("Ohne Artikelverknüpfung")}</option>{entries.data?.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select>{entries.error ? <span role="alert">{entries.error}</span> : null}</label>;
}
/** Freiwillig: bleibt das Feld leer, trägt der Verlauf einen Standardgrund (`figuren-gruende.ts`). */
function Reason({ value, onChange }: { value: string; onChange(value: string): void }) { return <label>{t("Grund (freiwillig, erscheint im Verlauf)")}<input maxLength={500} value={value} onChange={event => onChange(event.target.value)} /></label>; }
function ActorDetails({ campaignId, current, gm, roster, revision, onChanged, onDirty }: { campaignId: string; current: ActorCard; gm: boolean; roster: Member[]; revision: number; onChanged(): void; onDirty(dirty: boolean): void }) {
  const [baseline, setBaseline] = useState(current), [name, setName] = useState(current.name), [kind, setKind] = useState<ActorKindValue>(current.kind === "unspecified" ? "npc" : current.kind);
  const [lore, setLore] = useState(current.loreEntryId), [reason, setReason] = useState(""), [user, setUser] = useState("");
  const controllers = useResource<ControllerCard[]>(gm ? apiPath(campaignId, `/actors/${current.id}/controllers`) : null, revision);
  const task = useTask(), command = useCommand();
  const dirty = name !== baseline.name || lore !== baseline.loreEntryId || (baseline.kind !== "unspecified" && kind !== baseline.kind) || !!reason;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  const replace = (actor: ActorCard) => { setBaseline(actor); setName(actor.name); setKind(actor.kind === "unspecified" ? "npc" : actor.kind); setLore(actor.loreEntryId); setReason(""); };
  const newer = current.version !== null && baseline.version !== null && current.version > baseline.version;
  useEffect(() => { if (!gm || (!dirty && newer)) replace(current); }, [current, dirty, newer, gm]);
  const controlledBy = [...new Set((controllers.data ?? []).filter(card => card.revokedAt === null).map(card => { const member = roster.find(row => row.userId === card.userId); return !member ? t("Ehemaliges Mitglied") : member.role === "leitung" ? t("Spielleitung") : member.displayName; }))].join(", ") || t("Spielleitung");
  const grund = reasonOrDefault(reason, "figur"), mitgliedHinweis = `figur-${baseline.id}-mitglied-hinweis`;
  const uebernehmen = async () => { if (!dirty || await confirmAction({ title: t("Ungespeicherte Änderungen verwerfen?"), message: t("Deine Änderungen an dieser Figur gehen verloren; du siehst danach den neuen Stand."), confirmLabel: t("Neuen Stand übernehmen"), danger: true })) replace(current); };
  const archivieren = async () => {
    if (!await confirmAction({ title: t("Figur archivieren?"), message: t("Neue Handlungen mit dieser Figur enden. Ihr Bogen und alles Bisherige bleiben als Beleg erhalten."), confirmLabel: t("Figur archivieren"), danger: true })) return;
    void task.run(async () => { await command(apiPath(campaignId, `/actors/${baseline.id}/archive`), { expectedVersion: baseline.version, reason: grund }); onDirty(false); onChanged(); });
  };
  return <section className="panel actor-details"><h2>{baseline.name}</h2><p className="field-help">{baseline.kind === "unspecified" ? t("Bestehende Figur") : t(FIGURENART_LABEL[baseline.kind])}{baseline.template ? ` · ${t("Aus Vorlage, Fassung {nummer}", { nummer: baseline.template.revision })}` : ` · ${t("Individuelle Figur")}`}</p><p className="field-help">{gm ? t("Gesteuert von: {personen}", { personen: controlledBy }) : t("Du steuerst diese Figur.")}</p>
    {newer ? <Notice tone="info">{t("Die Figur wurde inzwischen geändert.")} <Button onClick={() => void uebernehmen()}>{t("Aktuelle Figur übernehmen")}</Button></Notice> : null}
    {gm ? <><form onSubmit={event => { event.preventDefault(); void task.run(async () => { const saved = await command<ActorCard>(apiPath(campaignId, `/actors/${baseline.id}`), { expectedVersion: baseline.version, name, kind, loreEntryId: lore, reason: grund }, "PUT"); replace(saved); onChanged(); }); }}><fieldset className="actor-command-fields" disabled={task.busy}><label>{t("Figurenname")}<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></label><label>{t("Art der Figur")}<select value={kind} onChange={event => setKind(event.target.value as ActorKindValue)}>{FIGURENARTEN.map(id => <option key={id} value={id}>{t(FIGURENART_LABEL[id])}</option>)}</select></label><LoreField campaignId={campaignId} value={lore} onChange={setLore} /><Reason value={reason} onChange={setReason} /><div className="button-row"><Button type="submit" disabled={task.busy}>{t("Figur speichern")}</Button><Button variant="danger" disabled={task.busy} onClick={() => void archivieren()}>{t("Figur archivieren")}</Button></div></fieldset></form>
      <fieldset disabled={task.busy}><legend>{t("Kontrolle vergeben")}</legend><p className="field-help">{t("Wer die Kontrolle hat, kann den Bogen bearbeiten, mit dieser Figur handeln und ihren Wissensblick wählen. Dazu gehört auch, was die Figur schon weiß, und die Briefe, die sie bekommen hat.")}</p><label>{t("Mitglied")}<select value={user} onChange={event => setUser(event.target.value)}><option value="">{t("Mitglied wählen")}</option>{roster.filter(member => member.role !== "beobachter").map(member => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>
        <Button disabled={task.busy || !user} aria-describedby={!user ? mitgliedHinweis : undefined} onClick={() => void task.run(async () => { await command(apiPath(campaignId, `/actors/${baseline.id}/controllers/${user}`), { expectedVersion: controllers.data?.find(card => card.userId === user)?.version ?? 0, reason: grund }, "PUT"); onChanged(); })}>{t("Kontrolle erlauben")}</Button>
        {!user ? <p id={mitgliedHinweis} className="field-help">{t("Wähle zuerst ein Mitglied.")}</p> : null}
        <ul className="actor-object-list">{controllers.data?.filter(card => card.revokedAt === null).map(card => <li key={card.userId}><span>{roster.find(member => member.userId === card.userId)?.displayName ?? t("Ehemaliges Mitglied")}</span><Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => { await command(apiPath(campaignId, `/actors/${baseline.id}/controllers/${card.userId}/revoke`), { expectedVersion: card.version, reason: grund }); onChanged(); })}>{t("Kontrolle entziehen")}</Button></li>)}</ul>{controllers.error ? <Notice error>{controllers.error}</Notice> : null}</fieldset></> : <p>{t("Deinen Bogen und deine Handlungen findest du in den benachbarten Tischansichten.")}</p>}
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </section>;
}
