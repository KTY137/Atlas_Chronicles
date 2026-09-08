// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
﻿import type { ReaderPerspective as Perspective } from "@chronicle/protocol";
import { ReaderPerspective } from "./features/ReaderPerspective";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, Hammer, ChevronDown, Compass, Dice6, Home, LogOut, Menu, MessageSquare, Plus, Settings, User, Users, X } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, ApiError, errorText, type Campaign, type Me } from "./api";
import { useResource, useTask } from "./hooks";
import { Auth } from "./Auth";
import { Wiki } from "./Wiki";
import { Round } from "./Round";
import { Heute } from "./features/Heute";
import { Account } from "./Account";
import { useCampaignLive, liveStatusLabel } from "./features/useCampaignLive";
import { useAppearance } from "./features/Appearance";
import type { ThemeManifestV1 } from "@chronicle/theme";
import { parseStage, type Stage, type TableTab } from "./navigation";
import { t } from "./i18n";
import { parseForgeSection, type ForgeSection } from "./features/forge-navigation";
import { QuickNavigation } from "./features/QuickNavigation";
import "./shell.css";

const AtlasView = lazy(() => import("./features/AtlasView").then((module) => ({ default: module.AtlasView })));
const TableView = lazy(() => import("./features/TableView").then(module => ({ default: module.TableView })));
const ChannelView = lazy(() => import("./features/ChannelView").then(module => ({ default: module.ChannelView })));
const WeekView = lazy(() => import("./features/WeekView").then(module => ({ default: module.WeekView })));
const RuleForge = lazy(() => import("./features/ForgeWorkbench").then(module => ({ default: module.ForgeWorkbench })));
const MeineFigur = lazy(() => import("./features/MeineFigur").then(module => ({ default: module.MeineFigur })));
// Die Bereichsnamen sind Oberflaeche, nicht Daten: `?stage=`, Routen und `data-*` behalten
// ihre deutschen Kennungen. Darum eine Funktion statt einer Konstanten — `t` liest die
// Sprache erst beim Zeichnen, und beim Sprachwechsel baut der Baum ohnehin neu auf.
const stageGroups = (): { label: string; items: { id: Stage; label: string; description: string; icon: typeof BookOpen }[] }[] => [
  { label: t("Spielen"), items: [
    { id: "heute", label: t("Heute"), description: t("Übersicht & Schnellzugriff"), icon: Home },
    { id: "ich", label: t("Ich"), description: t("Meine Figuren & Inventare"), icon: User },
    { id: "tisch", label: t("Tisch"), description: t("Würfel, Kampf & Szenen"), icon: Dice6 },
  ] },
  { label: t("Eure Welt"), items: [
    { id: "wiki", label: t("Chronik"), description: t("Artikel & Wissen"), icon: BookOpen },
    { id: "atlas", label: t("Atlas"), description: t("Weltkarte & Orte"), icon: Compass },
    { id: "woche", label: t("Woche"), description: t("Briefe & Vorhaben"), icon: CalendarDays },
    { id: "kanal", label: t("Kanal"), description: t("Nachrichten der Runde"), icon: MessageSquare },
  ] },
  { label: t("Vorbereiten & verwalten"), items: [
    { id: "schmiede", label: t("Schmiede"), description: t("Loot, NPCs, Karten & Regeln"), icon: Hammer },
    { id: "runde", label: t("Runde"), description: t("Mitglieder & Sicherungen"), icon: Users },
  ] },
];

export function App() {
  const [me, setMe] = useState<Me | null>(null), [loading, setLoading] = useState(true), [connectionError, setConnectionError] = useState("");
  const [revision, setRevision] = useState(0), [campaignId, setCampaignId] = useState(() => new URLSearchParams(location.search).get("campaign") ?? "");
  const [stage, setStage] = useState<Stage>(() => { const params = new URLSearchParams(location.search); return parseStage(params.get("stage"), params.has("entry")); });
  const [forgeSection, setForgeSection] = useState<ForgeSection>(() => parseForgeSection(new URLSearchParams(location.search).get("forge")));
  const [tableRequest, setTableRequest] = useState<{ tab: TableTab; request: number }>();
  const [menuOpen, setMenuOpen] = useState(false), menuButton = useRef<HTMLButtonElement>(null);
  const [composeSeed, setComposeSeed] = useState<{ entryId: string; passageIds: string[] }>();
  const [doorRequest, setDoorRequest] = useState<{ id?: string; request: number }>();
  const [dirty, setDirty] = useState(false), [choosing, setChoosing] = useState(false), [campaignName, setCampaignName] = useState("");
  const [membershipRevision, setMembershipRevision] = useState(0);
  const task = useTask(), campaigns = useResource<Campaign[]>(me ? "/api/campaigns" : null, revision + membershipRevision);
  const campaign = campaigns.data?.find((c) => c.id === campaignId) ?? null;
  const { setCampaignTheme } = useAppearance();
  const live = useCampaignLive(campaign?.id ?? null, me?.userId ?? null);
  useEffect(() => { setMembershipRevision(live.revision); }, [live.revision]);
  const theme = useResource<{ manifest: ThemeManifestV1 }>(campaign ? `/api/campaigns/${encodeURIComponent(campaign.id)}/theme-pin` : null, revision + live.revision);
  useEffect(() => { setCampaignTheme(theme.data?.manifest ?? null); }, [theme.data, setCampaignTheme]);
  const perspective = useResource<Perspective>(campaign ? `/api/campaigns/${encodeURIComponent(campaign.id)}/reader-perspective` : null, revision + live.revision);
  const knowledgeKey = `${campaign?.id}:${perspective.data?.actorId ?? "none"}`;
  const refreshSession = useCallback(async (joinedCampaign?: string) => {
    setLoading(true); setConnectionError("");
    try {
      const user = await api<Me>("/api/me"); setMe(user); setRevision((v) => v + 1);
      if (joinedCampaign) { setCampaignId(joinedCampaign); setStage("wiki"); const url = new URL(location.href); url.searchParams.delete("join"); url.searchParams.set("campaign", joinedCampaign); window.history.replaceState(null, "", url); }
    } catch (error) { setMe(null); if (!(error instanceof ApiError && error.status === 404)) setConnectionError(errorText(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const guard = () => !dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"));
  const navigate = (next: Stage, target?: { forge?: ForgeSection; tab?: TableTab }) => {
    if (next === stage && !choosing && !target) { setMenuOpen(false); return true; }
    if (!guard()) return false;
    if (menuOpen) menuButton.current?.focus();
    setDirty(false); setComposeSeed(undefined); setDoorRequest(undefined); setStage(next); setChoosing(false); setMenuOpen(false);
    const url = new URL(location.href); url.searchParams.set("stage", next); url.searchParams.delete("tab"); url.searchParams.delete("door"); url.searchParams.delete("forge"); url.searchParams.delete("inventory");
    if (next === "schmiede") { const section = target?.forge ?? "overview"; setForgeSection(section); url.searchParams.set("forge", section); }
    if (target?.tab) { url.searchParams.set("tab", target.tab); setTableRequest(previous => ({ tab: target.tab!, request: (previous?.request ?? 0) + 1 })); }
    else setTableRequest(undefined);
    window.history.replaceState(null, "", url);
    return true;
  };
  const openForge = (section: ForgeSection) => navigate("schmiede", { forge: section });
  const openTable = (tab: TableTab) => navigate("tisch", { tab });
  const changeForgeSection = (section: ForgeSection) => { setForgeSection(section); const url = new URL(location.href); url.searchParams.set("forge", section); window.history.replaceState(null, "", url); };
  const chooseCampaign = (id: string) => {
    if (id === campaignId && !choosing) return;
    if (!guard()) return; setDirty(false); setCampaignId(id); setComposeSeed(undefined); setDoorRequest(undefined); setTableRequest(undefined); setForgeSection("overview"); setChoosing(false); setMenuOpen(false); setStage("heute");
    const url = new URL(location.href); url.searchParams.set("campaign", id); for (const key of ["entry", "atlasMap", "atlasChild", "tab", "door", "forge", "inventory"]) url.searchParams.delete(key); url.searchParams.set("stage", "heute"); window.history.replaceState(null, "", url);
  };
  const openEntry = (id: string) => {
    if (!guard()) return;
    setTableRequest(undefined); setDoorRequest(undefined);
    const url = new URL(location.href); url.searchParams.set("entry", id); url.searchParams.set("stage", "wiki");
    window.history.replaceState(null, "", url); setComposeSeed(undefined); setDirty(false); setChoosing(false); setStage("wiki");
  };
  const composeLetter = (seed: { entryId: string; passageIds: string[] }) => {
    if (!guard()) return; setTableRequest(undefined); setDoorRequest(undefined); setComposeSeed(seed); setDirty(false); setChoosing(false); setStage("woche");
    const url = new URL(location.href); url.searchParams.set("stage", "woche"); window.history.replaceState(null, "", url);
  };
  const bereiche = stageGroups();
  const openDoors = (id?: string) => {
    if (!guard()) return; setDoorRequest(previous => ({ id, request: (previous?.request ?? 0) + 1 }));
    setTableRequest(undefined);
    setDirty(false); setChoosing(false); setStage("tisch");
    const url = new URL(location.href); url.searchParams.set("stage", "tisch"); url.searchParams.set("tab", "doors");
    if (id) url.searchParams.set("door", id); else url.searchParams.delete("door"); window.history.replaceState(null, "", url);
  };
  if (loading) return <div className="app-loading"><Loading text={t("Deine Chronik wird geöffnet …")} /></div>;
  if (connectionError) return <main className="connection-error"><Notice error>{connectionError}</Notice><Button onClick={() => void refreshSession()}>{t("Verbindung erneut prüfen")}</Button></main>;
  if (!me) return <Auth onAuthenticated={refreshSession} />;

  return <div className="application"><a className="skip-link" href="#main-content">{t("Zum Inhalt")}</a><header className="context-bar"><button className="wordmark" onClick={() => { if (guard()) { setDirty(false); setChoosing(true); } }} aria-label={t("Kampagnenübersicht")}><span aria-hidden="true">A✧</span><strong>ATLAS <small>CHRONICLES</small></strong></button><span className="context-divider" /><Button variant="quiet" className="campaign-trigger" onClick={() => { if (guard()) { setDirty(false); setChoosing(true); } }}>{campaign?.name ?? t("Deine Kampagnen")}<ChevronDown size={15} /></Button><div className="context-right">{campaign && !choosing ? <QuickNavigation key={`${campaign.id}:${campaign.role}`} gm={campaign.role === "leitung"} onNavigate={command => navigate(command.stage, command.target)} /> : null}<span className="user-name">{me.displayName}</span><Button variant="quiet" aria-label={t("Zugang verwalten")} onClick={() => navigate("account")}><Settings size={18} /></Button><Button variant="quiet" aria-label={t("Abmelden")} disabled={task.busy} onClick={() => { if (guard()) void task.run(async () => { await api("/api/logout", { method: "POST" }); setMe(null); setDirty(false); setCampaignId(""); }); }}><LogOut size={18} /></Button></div></header>
    <div className="mobile-navigation"><button ref={menuButton} type="button" aria-label={menuOpen ? t("Bereiche schließen") : t("Bereiche öffnen")} aria-expanded={menuOpen} aria-controls="area-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}<span>{bereiche.flatMap(group => group.items).find(item => item.id === stage)?.label ?? t("Zugang")}</span><ChevronDown size={15} /></button><span>{campaign?.role === "leitung" ? t("Spielleitung") : t("Deine Runde")}</span></div>
    <div className="app-main"><nav id="area-navigation" className={`rail${menuOpen ? " rail-open" : ""}`} aria-label={t("Bereiche")}>{bereiche.map(group => <div className="rail-group" key={group.label}><p className="rail-group-label">{group.label}</p>{group.items.filter(item => item.id !== "schmiede" || campaign?.role === "leitung").map(({ id, label, description, icon: Icon }) => <button key={id} className={stage === id && !choosing ? "rail-item active" : "rail-item"} aria-label={label} aria-current={stage === id && !choosing ? "page" : undefined} onClick={() => navigate(id)} disabled={!campaign}><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span></button>)}</div>)}</nav>
      <main id="main-content" className="main-stage" tabIndex={-1}>{campaign && !choosing && stage !== "account" ? <ReaderPerspective campaignId={campaign.id} gm={campaign.role === "leitung"} current={perspective.data} revision={revision + live.revision} guard={guard} onChanged={() => setRevision(v => v + 1)} /> : null}{campaigns.error && campaigns.data ? <Notice error>{campaigns.error}<Button onClick={() => setRevision(value => value + 1)}>{t("Kampagnen erneut laden")}</Button></Notice> : null}{perspective.error ? <Notice error>{perspective.error}</Notice> : null}{task.error ? <Notice error>{task.error}</Notice> : null}
        {stage === "account" && !choosing ? <Account me={me} onSessionChanged={refreshSession} /> : campaigns.loading ? <Loading text={t("Kampagnen werden geladen …")} /> : campaigns.error && !campaigns.data ? <Notice error>{campaigns.error}</Notice> : choosing || !campaign ? <section className="page-content campaign-page"><p className="eyebrow">{t("Deine Geschichten")}</p><h1>{t("Welches Kapitel schlagen wir auf?")}</h1><p className="muted">{t("Jede Runde hat ihre Welt. Hier beginnt eure nächste Geschichte.")}</p>
          {campaigns.data?.length ? <div className="campaign-grid">{campaigns.data.map((item) => <button className="campaign-card" key={item.id} onClick={() => chooseCampaign(item.id)}><span className="campaign-emblem" aria-hidden="true">✧</span><span className="eyebrow">{item.role === "leitung" ? t("Spielleitung") : t("Mitglied der Runde")}</span><h2>{item.name}</h2><span>{t("Chronik öffnen →")}</span></button>)}</div> : !me.canCreateCampaign ? <EmptyState title={t("Dein Platz wartet auf dich.")}>{t("Tritt über den Einladungslink deiner Spielleitung einer Runde bei.")}</EmptyState> : null}
          {me.canCreateCampaign ? <form className="panel create-campaign" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { const created = await api<Campaign>("/api/campaigns", { method: "POST", body: { name: campaignName.trim() } }); setRevision((v) => v + 1); setCampaignName(""); chooseCampaign(created.id); }); }}><h2><Plus size={19} /> {t("Eine neue Runde")}</h2><label>{t("Name der Kampagne")}<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={160} placeholder={t("Wie heißt eure Geschichte?")} required /></label><Button type="submit" variant="primary" disabled={task.busy || !campaignName.trim()}>{t("Kampagne anlegen")}</Button></form> : null}
        </section> : stage === "ich" ? <Suspense fallback={<Loading text={t("Deine Figur wird geöffnet …")} />}><MeineFigur key={campaign.id} campaign={campaign} liveRevision={revision + live.revision} onDirty={setDirty} /></Suspense> : stage === "heute" ? <Heute key={campaign.id} campaign={campaign} displayName={me.displayName} anwesend={live.presence} liveRevision={revision + live.revision} onNavigate={navigate} onOpenForge={openForge} onOpenTable={openTable} onOpenEntry={openEntry} /> : ["wiki", "atlas", "woche"].includes(stage) && !perspective.data ? <Loading text={t("Wissensblick wird geladen ...")} /> : stage === "wiki" ? <Wiki key={knowledgeKey} campaign={campaign} onDirty={setDirty} liveRevision={revision + live.revision} onComposeLetter={composeLetter} onOpenDoors={openDoors} /> : stage === "runde" ? <Round key={campaign.id} campaign={campaign} /> : stage === "atlas" ? <Suspense fallback={<Loading text={t("Atlas wird geöffnet …")} />}><AtlasView key={knowledgeKey} campaignId={campaign.id} role={campaign.role} onOpenEntry={openEntry} onDirty={setDirty} /></Suspense> : stage === "tisch" ? <Suspense fallback={<Loading text={t("Tisch wird geöffnet …")} />}><TableView readerScope={knowledgeKey} blickActorId={perspective.data?.actorId ?? null} key={campaign.id} openDoor={doorRequest} openTab={tableRequest} onOpenForge={openForge} liveRevision={revision + live.revision} campaign={campaign} userId={me.userId} onOpenEntry={openEntry} onDirty={setDirty} /></Suspense> : stage === "woche" ? <Suspense fallback={<Loading text={t("Woche wird geöffnet …")} />}><WeekView key={knowledgeKey} campaign={campaign} userId={me.userId} liveRevision={revision + live.revision} onDirty={setDirty} onOpenEntry={openEntry} onOpenDoors={openDoors} composeSeed={composeSeed} /></Suspense> : stage === "schmiede" ? campaign.role === "leitung" ? <Suspense fallback={<Loading text={t("Schmiede wird geöffnet …")} />}><RuleForge key={campaign.id} section={forgeSection} onSectionChange={changeForgeSection} onOpenMaps={() => openTable("tactical")} onOpenTable={() => openTable("actors")} campaign={campaign} authorName={me.displayName} liveRevision={revision + live.revision} onDirty={setDirty} onChanged={() => setRevision(value => value + 1)} /></Suspense> : <EmptyState title={t("Die Schmiede gehört der Spielleitung.")}>{t("Die aktiven Regeln findest du am Tisch.")}</EmptyState> : stage === "kanal" ? <Suspense fallback={<Loading text={t("Kanal wird geöffnet …")} />}><ChannelView key={campaign.id} campaign={campaign} userId={me.userId} live={live} onDirty={setDirty} /></Suspense> : null}
      </main></div><footer className="band">
        <span className="band-mark" aria-hidden="true">✧</span><span className="band-marke" title="Atlas Chronicles — Business Source License 1.1">Atlas Chronicles</span>
        {campaign ? <span className="band-runde">{campaign.name}</span> : null}
        {campaign ? <span className="band-connection" role="status" aria-label={t("Live-Verbindung")} data-live-state={live.status}>{liveStatusLabel[live.status]}</span> : null}
        {campaign && live.status === "connected" && live.presence.length > 0 ? <ul className="band-players" aria-label={t("Spieler in der Runde")} tabIndex={0}>
          {live.presence.map(person => { const zustand = person.state === "online" ? t("Online") : t("Abwesend"), selbst = person.userId === me.userId;
            return <li key={person.userId} className="band-player" aria-label={selbst ? t("{name} · du · {zustand}", { name: person.displayName, zustand }) : t("{name} · {zustand}", { name: person.displayName, zustand })} title={t("{name} · {zustand}", { name: person.displayName, zustand })}>
            <span className={`band-player-dot ${person.state}`} aria-hidden="true" /><span>{selbst ? t("{name} · du", { name: person.displayName }) : person.displayName}</span>
          </li>; })}
        </ul> : null}
        <span className={`band-status${dirty ? " band-status-dirty" : ""}`}>{dirty ? t("Ungespeicherter Entwurf") : me.displayName}</span><span className="role-chip">{campaign?.role === "leitung" ? t("Spielleitung") : campaign?.role === "spieler" ? t("Spieler") : "Chronicle"}</span>
      </footer>
  </div>;
}
