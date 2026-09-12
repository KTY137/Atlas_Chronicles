// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Scalar } from "@chronicle/rules";
import type { ActorCard } from "@chronicle/protocol";
import { Dice6, Hammer, Play, Plus, RefreshCw } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, plainText, type Campaign, type EntryDocument, type EntrySummary, type Member } from "../api";
import { useFrischeKarten, useResource, useTask } from "../hooks";
import { CharacterSheet } from "./CharacterSheet";
import { RollCard } from "./RollCard";
import { RuleFields } from "./RuleFields";
import { ActorWorkbench } from "./ActorWorkbench";
import { TacticalView } from "./TacticalView";
import { TableSurface } from "./TableSurface";
import { AdventureTree } from "./AdventureTree";
import { displayRulePackage } from "./chronicle-heroes-display";
import { Kampfbuehne } from "./Kampfbuehne";
import { ErleichterungGewaehren, OffeneErleichterungen } from "./Erleichterungen";
import { defaults, useCommand, type ActionCard, type ActorSheet, type DoorCard, type RulesState, type SceneCard } from "./game-api";
import { EinsatzWahl } from "./FaehigkeitenBogen";
import { quellenNamen, sichtbareEingaben } from "./faehigkeiten-bogen";
import { locale, t } from "../i18n";
import "./gameplay.css";
import { parseTableTab, type TableTab } from "../navigation";
import type { ForgeSection } from "./forge-navigation";

type Tab = TableTab;
export function TableView({ campaign, userId, onOpenEntry, onDirty, openDoor, openTab, onOpenForge, liveRevision = 0, readerScope = "", blickActorId = null }: { openTab?: { tab: TableTab; request: number }; onOpenForge?: (section: ForgeSection) => void; readerScope?: string; blickActorId?: string | null; openDoor?: { id?: string; request: number }; liveRevision?: number; campaign: Campaign; userId: string; onOpenEntry: (id: string) => void; onDirty: (value: boolean) => void }) {
  const [tab, setTab] = useState<Tab>(() => openDoor ? "doors" : parseTableTab(openTab?.tab ?? new URLSearchParams(location.search).get("tab"), campaign.role === "leitung")), [revision, setRevision] = useState(0), [actor, setActor] = useState<string | null>(null), [dirty, setDirty] = useState(false);
  useEffect(() => { if (openDoor) setTab("doors"); }, [openDoor]);
  useEffect(() => { if (openTab && !openDoor) setTab(parseTableTab(openTab.tab, campaign.role === "leitung")); }, [openTab, openDoor, campaign.role]);
  const gm = campaign.role === "leitung", rules = useResource<RulesState>(apiPath(campaign.id, "/rules"), revision + liveRevision);
  const roster = useResource<Member[]>(apiPath(campaign.id, "/roster"), revision + liveRevision), scenes = useResource<SceneCard[]>(apiPath(campaign.id, "/scenes"), revision + liveRevision, 6000);
  const actors = useResource<ActorCard[]>(apiPath(campaign.id, "/actors"), revision + liveRevision);
  const controlled = actors.data?.filter(a => a.canControl).map(a => ({ actorId: a.id, displayName: a.name })) ?? [];
  const namedActors: Member[] = actors.data?.map(a => ({ actorId: a.id, displayName: a.name, userId: "", role: "spieler" })) ?? [];
  // Pin the initial choice once. Later grants must not switch an open draft to a different actor.
  // Die handelnde Figur folgt dem Wissensblick, solange niemand ausdruecklich etwas anderes
  // gewaehlt hat. Vorher nahm sie die ERSTE fuehrbare Figur — sortiert nach Kennung, also nach
  // nichts: wer als Sera las, handelte am Tisch womoeglich still als Bruder Halm.
  useEffect(() => {
    if (actor !== null || !actors.data) return;
    const blick = blickActorId && actors.data.find(a => a.id === blickActorId && a.canControl);
    setActor((blick || actors.data.find(a => a.canControl))?.id ?? "");
  }, [actor, actors.data, blickActorId]);
  const actorId = controlled.find((member) => member.actorId === actor)?.actorId ?? "";
  const active = scenes.data?.find((scene) => scene.status === "active");
  const changeDirty = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const refresh = () => setRevision((value) => value + 1);
  const tabs: { id: Tab; label: string }[] = [{ id: "table", label: t("Spieltisch") }, { id: "actions", label: t("Aktionen") }, { id: "sheet", label: t("Figur") }, { id: "actors", label: t("Figuren & Inventar") }, { id: "tactical", label: t("Szenenkarte") }, { id: "kampf", label: t("Kampf") }, { id: "scenes", label: t("Szenen") }, ...(gm ? [{ id: "adventure" as const, label: t("Abenteuerbaum") }, { id: "canon" as const, label: t("Kanon") }] : []), { id: "doors", label: t("Vollmachten") }];
  const chooseTab = (id: Tab) => {
    if (tab === id) return true;
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return false;
    setTab(id); changeDirty(false);
    const url = new URL(location.href); url.searchParams.set("tab", id); if (id !== "doors") url.searchParams.delete("door"); window.history.replaceState(null, "", url);
    return true;
  };
  const openInventory = (id: string) => { if (chooseTab("actors")) { setActor(id); } };
  const descriptions: Record<Tab, string> = { table: t("Karte, Figuren und Würfel an einem gemeinsamen Tisch."), adventure: t("Szenen und Entscheidungen für euer Abenteuer planen und speichern."), actions: t("Aktionen wählen, Proben würfeln und Ergebnisse bestätigen."), sheet: t("Werte und Ressourcen der handelnden Figur bearbeiten."), actors: t("Figuren führen, Inventare öffnen und Beute an die Gruppe verteilen."), tactical: t("Szenenkarten vorbereiten und gemeinsam bespielen."), kampf: t("Initiative, Reihenfolge und aktive Züge im Blick behalten."), scenes: t("Den nächsten Abschnitt eures Abends vorbereiten und beginnen."), canon: t("Erlebtes als Geschichte bestätigen und Wissen freigeben."), doors: t("Erlaubte Aktionen vorbereiten, die eure Figuren selbst auslösen können.") };
  return <section className="page-content table-page"><div className="page-heading"><div><p className="eyebrow">{t("Der gemeinsame Abend")}</p><h1>{t("Am Tisch")}</h1><p className="muted">{active ? `${active.name} · ${active.fictionDate}` : t("Noch keine Szene eröffnet.")}</p></div><div className="button-row">{gm && onOpenForge ? <Button onClick={() => onOpenForge("overview")}><Hammer size={16} /> {t("Loot & NPCs vorbereiten")}</Button> : null}<Button aria-label={t("Tisch aktualisieren")} onClick={refresh}><RefreshCw size={16} /></Button></div></div>
    <div className="table-controls"><div className="view-tabs" role="tablist" aria-label={t("Tischansichten")}>{tabs.map(({ id, label }, index) => <button key={id} id={`table-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="table-tab-panel" tabIndex={tab === id ? 0 : -1} onClick={() => chooseTab(id)} onKeyDown={event => {
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
      if (next !== null) { event.preventDefault(); const target = tabs[next]!.id; if (chooseTab(target)) document.getElementById(`table-tab-${target}`)?.focus(); }
    }}>{label}</button>)}</div>{controlled.length ? <label className="actor-picker">{t("Handelnde Figur")}<select value={actorId} onChange={(e) => { if (e.target.value === actorId) return; if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) { setActor(e.target.value); changeDirty(false); } }}>{!actorId ? <option value="">{t("Figur wählen")}</option> : null}{controlled.map((member) => <option key={member.actorId} value={member.actorId!}>{member.displayName}</option>)}</select></label> : null}</div>
    {rules.error || roster.error || scenes.error || actors.error ? <Notice error>{rules.error || roster.error || scenes.error || actors.error}</Notice> : null}
    {actor && !actorId && actors.data ? <Notice>{t("Die bisher ausgewählte Figur steht dir nicht mehr zur Verfügung. Wähle eine andere Figur.")}</Notice> : null}
    {/* Als eine Figur lesen und als eine andere handeln ist erlaubt — aber niemand soll es
        versehentlich tun. Deshalb wird es gesagt, nicht verhindert. */}
    {actorId && blickActorId && actorId !== blickActorId ? <Notice>{t("Du handelst als {figur}, liest die Chronik aber mit dem Wissen von {blick}.", { figur: actors.data?.find(a => a.id === actorId)?.name ?? t("dieser Figur"), blick: actors.data?.find(a => a.id === blickActorId)?.name ?? t("einer anderen Figur") })}</Notice> : null}
    <div id="table-tab-panel" role="tabpanel" aria-labelledby={`table-tab-${tab}`}>
    <p className="table-view-description">{descriptions[tab]}</p>
    {rules.loading || roster.loading || actors.loading ? <Loading /> : rules.data ? tab === "table" ? <TableSurface key={`${campaign.id}:${readerScope}:${gm}`} campaignId={campaign.id} gm={gm} actors={actors.data ?? []} roster={roster.data ?? []} actorId={actorId} revision={revision + liveRevision} onChanged={refresh} onDirty={changeDirty} onOpenEntry={onOpenEntry} onOpenInventory={openInventory} onOpenMap={() => chooseTab("tactical")} /> : tab === "adventure" && gm ? <AdventureTree key={campaign.id} campaignId={campaign.id} scenes={scenes.data ?? []} revision={revision + liveRevision} onChanged={refresh} onDirty={changeDirty} /> : tab === "tactical" ? <TacticalView key={readerScope} onOpenEntry={onOpenEntry} campaignId={campaign.id} gm={gm} revision={revision + liveRevision} onDirty={changeDirty} /> : tab === "kampf" ? <Kampfbuehne onOpenInventory={openInventory} campaignId={campaign.id} gm={gm} actors={actors.data ?? []} revision={revision + liveRevision} onChanged={refresh} /> : tab === "actors" ? <ActorWorkbench key={actorId} onOpenForge={onOpenForge} campaignId={campaign.id} gm={gm} actorId={actorId} actors={actors.data ?? []} roster={roster.data ?? []} rules={rules.data} revision={revision + liveRevision} onChanged={refresh} onDirty={changeDirty} /> : tab === "scenes" ? <Scenes campaignId={campaign.id} gm={gm} scenes={scenes.data ?? []} onChanged={refresh} onOpenEntry={onOpenEntry} /> : tab === "canon" && gm ? <Canon campaignId={campaign.id} roster={namedActors} actorId={actorId} fictionDate={active?.fictionDate ?? ""} onChanged={refresh} /> : tab === "doors" ? <Doors selectedId={openDoor?.id ?? new URLSearchParams(location.search).get("door") ?? undefined} campaignId={campaign.id} rules={rules.data} roster={namedActors} actorId={actorId} gm={gm} revision={revision + liveRevision} onChanged={refresh} /> : !actorId ? <EmptyState title={t("Eine Figur macht den Anfang.")} action={gm && onOpenForge ? <Button variant="primary" onClick={() => onOpenForge("actors")}>{t("Figur in der Schmiede erstellen")}</Button> : undefined}>{gm ? t("Erstelle eine Figur oder lade deine Gruppe ein. Danach stehen hier Charakterbogen und Aktionen bereit.") : t("Sobald deine Spielleitung dir eine Figur zuweist, stehen hier Charakterbogen und Aktionen bereit.")}</EmptyState> : tab === "sheet" ? <CharacterSheet liveRevision={revision + liveRevision} key={actorId} campaignId={campaign.id} actorId={actorId} rules={rules.data} gm={gm} onDirty={changeDirty} onChanged={refresh} /> : <Actions key={`${actorId}-${rules.data.pin.id}-${rules.data.pin.version}`} campaignId={campaign.id} actorId={actorId} rules={rules.data} gm={gm} fictionDate={active?.fictionDate ?? ""} roster={namedActors} revision={revision + liveRevision} onChanged={refresh} /> : null}
    </div>
  </section>;
}

function TargetPassage({ campaignId, entryId, passageId, onEntry, onPassage }: { campaignId: string; entryId: string; passageId: string; onEntry: (id: string) => void; onPassage: (id: string) => void }) {
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  const document = useResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${encodeURIComponent(entryId)}`) : null);
  return <div className="rule-fields"><label>{t("Artikel")}<select value={entryId} onChange={(e) => { onEntry(e.target.value); onPassage(""); }}><option value="">{t("Kein Artikel ausgewählt")}</option>{entries.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label><label>{t("Passage")}<select value={passageId} disabled={!document.data} onChange={(e) => onPassage(e.target.value)}><option value="">{t("Bitte wählen")}</option>{document.data?.passagen.map((passage, i) => <option key={passage.pid} value={passage.pid}>{i + 1}. {plainText(passage.inhalt).slice(0, 100)}</option>)}</select></label>{entries.error || document.error ? <Notice error>{entries.error || document.error}</Notice> : null}</div>;
}

function Actions({ campaignId, actorId, rules, gm, fictionDate, roster, revision, onChanged }: { campaignId: string; actorId: string; rules: RulesState; gm: boolean; fictionDate: string; roster: Member[]; revision: number; onChanged: () => void }) {
  const sheet = useResource<ActorSheet>(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`), revision);
  const sourcePackage = rules.packages.find((pkg) => pkg.id === sheet.data?.packageId && pkg.version === sheet.data.packageVersion);
  const pkg = sourcePackage ? displayRulePackage(sourcePackage) : undefined;
  const [actionId, setActionId] = useState(""), [input, setInput] = useState<Record<string, Scalar>>({}), [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState("");
  const action = pkg?.actions.find((action) => action.id === actionId) ?? pkg?.actions[0];
  const rolls = useResource<ActionCard[]>(apiPath(campaignId, "/rolls"), revision, 6000), task = useTask(), command = useCommand();
  const frisch = useFrischeKarten(rolls.data?.map(karte => karte.id) ?? null);
  return <div className="table-columns"><div className="action-column">
    {/* Erst das Zugestaendnis, dann der eigene Wurf: was einem entgegengekommen wird, soll man
        sehen, BEVOR man die Probe von Hand zusammenstellt. */}
    <OffeneErleichterungen campaignId={campaignId} actorId={actorId} rules={rules} gm={gm} revision={revision}
      onChanged={onChanged} onGewuerfelt={() => onChanged()} />
    <form className="panel action-form" onSubmit={(event) => { event.preventDefault(); if (action) void task.run(async () => { await command(apiPath(campaignId, "/rolls"), { actorId, actionId: action.id, input: { ...defaults(action.inputs), ...input }, ...(passageId && gm ? { targetPassageId: passageId } : {}), ...(fictionDate ? { fictionDate } : {}) }); onChanged(); }); }}><h2><Dice6 size={20} /> {t("Eine Handlung wagen")}</h2>
    {task.error || sheet.error ? <Notice error>{task.error || sheet.error}</Notice> : null}{sheet.loading ? <Loading /> : action ? <><label>{t("Aktion")}<select value={action.id} onChange={(e) => { setActionId(e.target.value); setInput({}); }}>{pkg?.actions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="field-help">{action.disclosure}</p><RuleFields fields={sichtbareEingaben(pkg, action.inputs)} values={{ ...defaults(action.inputs), ...input }} onChange={next => setInput(current => ({ ...current, ...next }))} disabled={task.busy} />{pkg ? <EinsatzWahl pkg={pkg} fields={sheet.data?.fields} actionId={action.id} einsatz={typeof input.einsatz === "string" ? input.einsatz : ""} onEinsatz={value => setInput(current => ({ ...current, einsatz: value }))} disabled={task.busy} /> : null}{gm ? <details><summary>{t("Erfolg mit einer Passage verbinden")}</summary><p className="field-help">{t("Bei Erfolg und deiner Bestätigung wird diese Passage am Tisch geprägt.")}</p><TargetPassage campaignId={campaignId} entryId={entryId} passageId={passageId} onEntry={setEntryId} onPassage={setPassageId} /></details> : null}<Button type="submit" variant="primary" disabled={task.busy}>{task.busy ? <><span className="wuerfel-rollt" aria-hidden="true"><Dice6 size={17} /></span> {t("Würfelt …")}</> : <><Dice6 size={17} /> {t("Würfeln")}</>}</Button></> : <Notice error>{t("Keine Aktion für diesen Bogen verfügbar.")}</Notice>}
  </form>
    {gm ? <ErleichterungGewaehren campaignId={campaignId} rules={rules} roster={roster} revision={revision} onChanged={onChanged} /> : null}
  </div><section className="roll-feed"><h2>{t("Ergebnisse und Belege")}</h2>{rolls.loading ? <Loading /> : rolls.error ? <Notice error>{rolls.error}</Notice> : rolls.data?.length ? rolls.data.map((card) => <RollCard key={card.id} card={card} frisch={frisch.has(card.id)} namen={quellenNamen(pkg)} campaignId={campaignId} actorName={roster.find((member) => member.actorId === card.actorId)?.displayName ?? t("Figur")} onChanged={onChanged} />) : <EmptyState title={t("Der erste Wurf wartet.")}>{t("Ein echter Wurf kommt vom Server. Sein Rechenweg bleibt nachvollziehbar.")}</EmptyState>}</section></div>;
}

function Scenes({ campaignId, gm, scenes, onChanged, onOpenEntry }: { campaignId: string; gm: boolean; scenes: SceneCard[]; onChanged: () => void; onOpenEntry: (id: string) => void }) {
  const task = useTask(), [name, setName] = useState(""), [date, setDate] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  return <div className="table-columns">{gm ? <form className="panel" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { await api(apiPath(campaignId, "/scenes"), { method: "POST", body: { name, fictionDate: date, entryIds: selected } }); setName(""); setSelected([]); onChanged(); }); }}><h2><Plus size={19} /> {t("Szene vorbereiten")}</h2><label>{t("Name")}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} /></label><label>{t("Datum in eurer Welt")}<input value={date} onChange={(e) => setDate(e.target.value)} required maxLength={120} placeholder={t("z. B. 12. Tag des Frostmonds")} /></label><label>{t("Artikel für diese Szene")}<select multiple value={selected} onChange={(e) => setSelected([...e.target.selectedOptions].map((option) => option.value))}>{entries.data?.map((entry) => <option value={entry.id} key={entry.id}>{entry.title}</option>)}</select></label><Button type="submit" variant="primary" disabled={task.busy}>{t("Szene vorbereiten")}</Button>{task.error ? <Notice error>{task.error}</Notice> : null}</form> : null}<div>{scenes.length ? scenes.map((scene) => <section className="panel scene-card" key={scene.id}><span className="eyebrow">{scene.status === "active" ? t("Am Tisch") : scene.status === "prepared" ? t("Vorbereitet") : t("Abgeschlossen")}</span><h2>{scene.name}</h2><p className="muted">{scene.fictionDate}</p><div className="scene-links">{scene.entryIds.map((id) => <Button key={id} onClick={() => onOpenEntry(id)}>{entries.data?.find((entry) => entry.id === id)?.title ?? t("Artikel öffnen")}</Button>)}</div>{gm && scene.status !== "active" ? <Button disabled={task.busy} onClick={() => void task.run(async () => { await api(apiPath(campaignId, `/scenes/${encodeURIComponent(scene.id)}/start`), { method: "POST" }); onChanged(); })}><Play size={15} /> {t("Szene beginnen")}</Button> : null}</section>) : <EmptyState title={t("Ein Abend voller Möglichkeiten.")}>{t("Die Spielleitung kann die erste Szene vorbereiten und am Tisch eröffnen.")}</EmptyState>}</div></div>;
}

function Canon({ campaignId, roster, actorId, fictionDate, onChanged }: { campaignId: string; roster: Member[]; actorId: string; fictionDate: string; onChanged: () => void }) {
  const [kind, setKind] = useState("gesprochen"), [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState(""), [replacedEntry, setReplacedEntry] = useState(""), [replaces, setReplaces] = useState("");
  const [date, setDate] = useState(fictionDate), [recipients, setRecipients] = useState<string[]>([]), [receipt, setReceipt] = useState<string>("");
  const task = useTask(), command = useCommand();
  const sheet = useResource<ActorSheet>(actorId ? apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`) : null);
  return <form className="panel canon-form" onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
    await command(apiPath(campaignId, `/mints/${kind}`), { passageId, fictionDate: date, actorIds: recipients,
      ...(kind === "berichtigung" ? { replaces } : {}), ...(kind === "defeat" && sheet.data ? { actorId, expectedVersion: sheet.data.version } : {}) });
    setReceipt(t("Die Passage wurde geprägt. Der Herkunftsbeleg liegt in der Chronik.")); onChanged();
  }); }}><h2>{t("Ein Moment wird Geschichte.")}</h2><p className="muted">{t("Du bestätigst diese Passage ausdrücklich als Kanon und wählst, welche Figuren davon erfahren.")}</p>{task.error ? <Notice error>{task.error}</Notice> : null}{receipt ? <Notice>{receipt}</Notice> : null}
    <label>{t("Art der Bestätigung")}<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="gesprochen">{t("Am Tisch gesprochen")}</option><option value="ratifikation">{t("Einen bestehenden Antrag ratifizieren")}</option><option value="berichtigung">{t("Bestehenden Kanon berichtigen")}</option>{sheet.data?.defeatPending ? <option value="defeat">{t("Niederlage der Figur bestätigen")}</option> : null}</select></label>
    <TargetPassage campaignId={campaignId} entryId={entryId} passageId={passageId} onEntry={setEntryId} onPassage={setPassageId} />
    {kind === "berichtigung" ? <fieldset className="sheet-section"><legend>{t("Die bisherige kanonische Passage")}</legend><TargetPassage campaignId={campaignId} entryId={replacedEntry} passageId={replaces} onEntry={setReplacedEntry} onPassage={setReplaces} /></fieldset> : null}
    {kind === "ratifikation" ? <p className="field-help">{t("Nur eine bereits als Antrag eingereichte Passage kann ratifiziert werden.")}</p> : null}
    <label>{t("Datum in eurer Welt")}<input value={date} onChange={(e) => setDate(e.target.value)} required maxLength={120} /></label>
    <label>{t("Diese Figuren erfahren davon")}<select multiple value={recipients} onChange={(e) => setRecipients([...e.target.selectedOptions].map((option) => option.value))}>{roster.filter((member) => member.actorId).map((member) => <option value={member.actorId!} key={member.actorId}>{member.displayName}</option>)}</select></label>
    <Button type="submit" variant="primary" disabled={task.busy || !passageId || (kind === "berichtigung" && !replaces)}>{t("Kanon bestätigen")}</Button>
  </form>;
}

function Doors({ selectedId, campaignId, rules, roster, actorId, gm, revision, onChanged }: { selectedId?: string; campaignId: string; rules: RulesState; roster: Member[]; actorId: string; gm: boolean; revision: number; onChanged: () => void }) {
  const task = useTask(), command = useCommand(), doors = useResource<DoorCard[]>(apiPath(campaignId, "/vollmachten"), revision, 6000);
  const sheet = useResource<ActorSheet>(actorId ? apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`) : null, revision);
  const pkg = rules.packages.find((item) => item.id === sheet.data?.packageId && item.version === sheet.data.packageVersion);
  const [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState(""), [actionId, setActionId] = useState(""), [input, setInput] = useState<Record<string, Scalar>>({});
  const [threshold, setThreshold] = useState(9), [hours, setHours] = useState(24), [date, setDate] = useState(""), [repeatable, setRepeatable] = useState(false), [budget, setBudget] = useState("player");
  const focusedDoor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedId) { focusedDoor.current = undefined; return; }
    if (focusedDoor.current === selectedId || !doors.data) return;
    const target = document.getElementById(`door-${selectedId}`);
    if (target) { target.focus(); focusedDoor.current = selectedId; }
  }, [selectedId, doors.data]);
  const availableActions = pkg?.actions.filter(item => !("outcome" in item && item.outcome)) ?? [];
  const action = availableActions.find((item) => item.id === actionId) ?? availableActions[0];
  const [prepared, setPrepared] = useState<ActionCard | null>(null);
  return <div className="table-columns">{gm ? <form className="panel" onSubmit={(event) => { event.preventDefault(); if (action) void task.run(async () => { await command(apiPath(campaignId, "/vollmachten"), { actorId, passageId, actionId: action.id, input: { ...defaults(action.inputs), ...input }, threshold, expiresAt: Date.now() + hours * 3600_000, repeatable, budgetKind: budget, fictionDate: date }); onChanged(); }); }}><h2>{t("Eine Tür für später öffnen")}</h2><p className="field-help">{t("Die ausgewählte Figur kann die festgelegte Handlung selbst auslösen. Nur ihr wird diese Vollmacht angezeigt.")}</p><TargetPassage campaignId={campaignId} entryId={entryId} passageId={passageId} onEntry={setEntryId} onPassage={setPassageId} />
    <label>{t("Aktion")}<select value={action?.id ?? ""} onChange={(e) => { setActionId(e.target.value); setInput({}); }} required><option value="">{t("Bitte wählen")}</option>{availableActions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{action ? <RuleFields fields={sichtbareEingaben(pkg, action.inputs)} values={{ ...defaults(action.inputs), ...input }} onChange={next => setInput(current => ({ ...current, ...next }))} /> : null}
    {pkg?.schemaVersion === 2 ? <p className="field-help">{t("Proben mit Ergebnisbereichen werden am Tisch gewürfelt und bestätigt. Für diese Vollmacht stehen Aktionen mit einer festen Erfolgsschwelle zur Verfügung.")}</p> : null}
    <div className="rule-fields"><label>{t("Erfolg ab")}<input type="number" value={threshold} onChange={(e) => setThreshold(e.target.valueAsNumber)} required /></label><label>{t("Gültig für Stunden")}<input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.valueAsNumber)} required /></label></div><label>{t("Datum in eurer Welt")}<input value={date} onChange={(e) => setDate(e.target.value)} required /></label><label>{t("Wochenkontingent")}<select value={budget} onChange={(e) => setBudget(e.target.value)}><option value="player">{t("Eine Vollmacht pro Spieler")}</option><option value="floating">{t("Freies Kontingent der Runde")}</option></select></label><label className="check-label"><input type="checkbox" checked={repeatable} onChange={(e) => setRepeatable(e.target.checked)} /> {t("Bei Misserfolg erneut versuchen dürfen")}</label><Button type="submit" variant="primary" disabled={task.busy || !actorId || !passageId || !action}>{t("Vollmacht erteilen")}</Button>{task.error ? <Notice error>{task.error}</Notice> : null}
  </form> : null}<section>{!gm && task.error ? <Notice error>{task.error}</Notice> : null}{prepared ? <RollCard card={prepared} frisch campaignId={campaignId} actorName={roster.find((member) => member.actorId === prepared.actorId)?.displayName ?? t("Figur")} onChanged={() => { setPrepared(null); onChanged(); }} /> : null}{doors.loading ? <Loading /> : doors.error ? <Notice error>{doors.error}</Notice> : doors.data?.length ? doors.data.map((door) => <article className="panel door-card" key={door.id} id={`door-${door.id}`} tabIndex={-1}><span className="eyebrow">{door.status}</span><h2>{door.targetSlug}</h2><p className="muted">{roster.find((member) => member.actorId === door.actorId)?.displayName ?? t("Deine Figur")} · {door.actionId}</p><p className="field-help">{t("Gültig bis {zeit}", { zeit: new Date(door.expiresAt).toLocaleString(locale()) })}</p>{door.status === "offen" && door.expiresAt > Date.now() ? <div className="button-row"><Button variant="primary" disabled={task.busy} onClick={() => void task.run(async () => { setPrepared(await command<ActionCard>(apiPath(campaignId, `/vollmachten/${encodeURIComponent(door.id)}/roll`), {})); })}><Dice6 size={16} /> {t("Handlung wagen")}</Button>{gm ? <Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => { await api(apiPath(campaignId, `/vollmachten/${encodeURIComponent(door.id)}`), { method: "DELETE" }); onChanged(); })}>{t("Widerrufen")}</Button> : null}</div> : null}</article>) : <EmptyState title={t("Gerade ist keine Tür offen.")}>{gm ? t("Erteile einer Figur eine klar begrenzte Vollmacht für die Zeit zwischen den Abenden.") : t("Wenn deine Spielleitung dir eine Vollmacht erteilt, findest du sie hier.")}</EmptyState>}</section></div>;
}
