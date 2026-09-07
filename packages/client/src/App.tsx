import type { ReaderPerspective as Perspective } from "@chronicle/protocol";
import { ReaderPerspective } from "./features/ReaderPerspective";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { BookOpen, CalendarDays, Hammer, ChevronDown, Compass, Dice6, Home, LogOut, MessageSquare, Plus, Settings, User, Users } from "lucide-react";
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

const AtlasView = lazy(() => import("./features/AtlasView").then((module) => ({ default: module.AtlasView })));
const TableView = lazy(() => import("./features/TableView").then(module => ({ default: module.TableView })));
const ChannelView = lazy(() => import("./features/ChannelView").then(module => ({ default: module.ChannelView })));
const WeekView = lazy(() => import("./features/WeekView").then(module => ({ default: module.WeekView })));
const RuleForge = lazy(() => import("./features/ForgeWorkbench").then(module => ({ default: module.ForgeWorkbench })));
const MediaPanel = lazy(() => import("./features/MediaPanel").then(module => ({ default: module.MediaPanel })));
const MeineFigur = lazy(() => import("./features/MeineFigur").then(module => ({ default: module.MeineFigur })));
type Stage = "heute" | "ich" | "wiki" | "atlas" | "tisch" | "kanal" | "woche" | "schmiede" | "runde" | "account";
const stages: { id: Stage; label: string; icon: typeof BookOpen }[] = [{ id: "heute", label: "Heute", icon: Home }, { id: "ich", label: "Ich", icon: User }, { id: "wiki", label: "Chronik", icon: BookOpen }, { id: "atlas", label: "Atlas", icon: Compass }, { id: "tisch", label: "Tisch", icon: Dice6 }, { id: "kanal", label: "Kanal", icon: MessageSquare }, { id: "woche", label: "Woche", icon: CalendarDays }, { id: "schmiede", label: "Schmiede", icon: Hammer }, { id: "runde", label: "Runde", icon: Users }];

export function App() {
  const [me, setMe] = useState<Me | null>(null), [loading, setLoading] = useState(true), [connectionError, setConnectionError] = useState("");
  const [revision, setRevision] = useState(0), [campaignId, setCampaignId] = useState(() => new URLSearchParams(location.search).get("campaign") ?? "");
  const [stage, setStage] = useState<Stage>(() => { const value = new URLSearchParams(location.search).get("stage"); return value === "heute" || value === "ich" || value === "atlas" || value === "runde" || value === "account" || value === "tisch" || value === "kanal" || value === "woche" || value === "schmiede" ? value : "wiki"; });
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
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const guard = () => !dirty || window.confirm("Ungespeicherte Änderungen verwerfen?");
  const navigate = (next: Stage) => {
    if (next === stage && !choosing) return;
    if (!guard()) return; setDirty(false); setComposeSeed(undefined); setDoorRequest(undefined); setStage(next); setChoosing(false);
    const url = new URL(location.href); url.searchParams.set("stage", next); url.searchParams.delete("tab"); url.searchParams.delete("door"); window.history.replaceState(null, "", url);
  };
  const chooseCampaign = (id: string) => {
    if (id === campaignId && !choosing) return;
    if (!guard()) return; setDirty(false); setCampaignId(id); setComposeSeed(undefined); setDoorRequest(undefined); setChoosing(false); setStage("heute");
    const url = new URL(location.href); url.searchParams.set("campaign", id); url.searchParams.delete("entry"); url.searchParams.delete("atlasMap"); url.searchParams.delete("atlasChild"); url.searchParams.set("stage", "heute"); window.history.replaceState(null, "", url);
  };
  const openEntry = (id: string) => {
    if (!guard()) return;
    const url = new URL(location.href); url.searchParams.set("entry", id); url.searchParams.set("stage", "wiki");
    window.history.replaceState(null, "", url); setComposeSeed(undefined); setDirty(false); setChoosing(false); setStage("wiki");
  };
  const composeLetter = (seed: { entryId: string; passageIds: string[] }) => {
    if (!guard()) return; setComposeSeed(seed); setDirty(false); setChoosing(false); setStage("woche");
    const url = new URL(location.href); url.searchParams.set("stage", "woche"); window.history.replaceState(null, "", url);
  };
  const openDoors = (id?: string) => {
    if (!guard()) return; setDoorRequest(previous => ({ id, request: (previous?.request ?? 0) + 1 }));
    setDirty(false); setChoosing(false); setStage("tisch");
    const url = new URL(location.href); url.searchParams.set("stage", "tisch"); url.searchParams.set("tab", "doors");
    if (id) url.searchParams.set("door", id); else url.searchParams.delete("door"); window.history.replaceState(null, "", url);
  };
  if (loading) return <div className="app-loading"><Loading text="Deine Chronik wird geöffnet …" /></div>;
  if (connectionError) return <main className="connection-error"><Notice error>{connectionError}</Notice><Button onClick={() => void refreshSession()}>Verbindung erneut prüfen</Button></main>;
  if (!me) return <Auth onAuthenticated={refreshSession} />;

  return <div className="application"><a className="skip-link" href="#main-content">Zum Inhalt</a><header className="context-bar"><button className="wordmark" onClick={() => { if (guard()) { setDirty(false); setChoosing(true); } }} aria-label="Kampagnenübersicht"><span aria-hidden="true">A✧</span><strong>ATLAS <small>CHRONICLES</small></strong></button><span className="context-divider" /><Button variant="quiet" className="campaign-trigger" onClick={() => { if (guard()) { setDirty(false); setChoosing(true); } }}>{campaign?.name ?? "Deine Kampagnen"}<ChevronDown size={15} /></Button><div className="context-right"><span className="user-name">{me.displayName}</span><Button variant="quiet" aria-label="Zugang verwalten" onClick={() => navigate("account")}><Settings size={18} /></Button><Button variant="quiet" aria-label="Abmelden" disabled={task.busy} onClick={() => { if (guard()) void task.run(async () => { await api("/api/logout", { method: "POST" }); setMe(null); setDirty(false); setCampaignId(""); }); }}><LogOut size={18} /></Button></div></header>
    <div className="app-main"><nav className="rail" aria-label="Bereiche">{stages.filter(item => item.id !== "schmiede" || campaign?.role === "leitung").map(({ id, label, icon: Icon }) => <button key={id} className={stage === id && !choosing ? "rail-item active" : "rail-item"} aria-current={stage === id && !choosing ? "page" : undefined} onClick={() => navigate(id)} disabled={!campaign}><Icon size={21} /><span>{label}</span></button>)}</nav>
      <main id="main-content" className="main-stage" tabIndex={-1}>{campaign && !choosing && stage !== "account" ? <ReaderPerspective campaignId={campaign.id} gm={campaign.role === "leitung"} current={perspective.data} revision={revision + live.revision} guard={guard} onChanged={() => setRevision(v => v + 1)} /> : null}{campaigns.error && campaigns.data ? <Notice error>{campaigns.error}<Button onClick={() => setRevision(value => value + 1)}>Kampagnen erneut laden</Button></Notice> : null}{perspective.error ? <Notice error>{perspective.error}</Notice> : null}{task.error ? <Notice error>{task.error}</Notice> : null}
        {stage === "account" && !choosing ? <Account me={me} onSessionChanged={refreshSession} /> : campaigns.loading ? <Loading text="Kampagnen werden geladen …" /> : campaigns.error && !campaigns.data ? <Notice error>{campaigns.error}</Notice> : choosing || !campaign ? <section className="page-content campaign-page"><p className="eyebrow">Deine Geschichten</p><h1>Welches Kapitel schlagen wir auf?</h1><p className="muted">Jede Runde hat ihre Welt. Hier beginnt eure nächste Geschichte.</p>
          {campaigns.data?.length ? <div className="campaign-grid">{campaigns.data.map((item) => <button className="campaign-card" key={item.id} onClick={() => chooseCampaign(item.id)}><span className="campaign-emblem" aria-hidden="true">✧</span><span className="eyebrow">{item.role === "leitung" ? "Spielleitung" : "Mitglied der Runde"}</span><h2>{item.name}</h2><span>Chronik öffnen →</span></button>)}</div> : !me.canCreateCampaign ? <EmptyState title="Dein Platz wartet auf dich.">Tritt über den Einladungslink deiner Spielleitung einer Runde bei.</EmptyState> : null}
          {me.canCreateCampaign ? <form className="panel create-campaign" onSubmit={(event) => { event.preventDefault(); void task.run(async () => { const created = await api<Campaign>("/api/campaigns", { method: "POST", body: { name: campaignName.trim() } }); setRevision((v) => v + 1); setCampaignName(""); chooseCampaign(created.id); }); }}><h2><Plus size={19} /> Eine neue Runde</h2><label>Name der Kampagne<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={160} placeholder="Wie heißt eure Geschichte?" required /></label><Button type="submit" variant="primary" disabled={task.busy || !campaignName.trim()}>Kampagne anlegen</Button></form> : null}
        </section> : stage === "ich" ? <Suspense fallback={<Loading text="Deine Figur wird geöffnet …" />}><MeineFigur key={campaign.id} campaign={campaign} onDirty={setDirty} /></Suspense> : stage === "heute" ? <Heute key={campaign.id} campaign={campaign} displayName={me.displayName} anwesend={live.presence} liveRevision={revision + live.revision} onNavigate={navigate} onOpenEntry={openEntry} /> : ["wiki", "atlas", "woche"].includes(stage) && !perspective.data ? <Loading text="Wissensblick wird geladen ..." /> : stage === "wiki" ? <Wiki key={knowledgeKey} campaign={campaign} onDirty={setDirty} liveRevision={revision + live.revision} onComposeLetter={composeLetter} onOpenDoors={openDoors} /> : stage === "runde" ? <Round key={campaign.id} campaign={campaign} /> : stage === "atlas" ? <Suspense fallback={<Loading text="Atlas wird geöffnet …" />}><AtlasView key={knowledgeKey} campaignId={campaign.id} role={campaign.role} onOpenEntry={openEntry} onDirty={setDirty} /></Suspense> : stage === "tisch" ? <Suspense fallback={<Loading text="Tisch wird geöffnet …" />}><TableView readerScope={knowledgeKey} key={campaign.id} openDoor={doorRequest} liveRevision={revision + live.revision} campaign={campaign} userId={me.userId} onOpenEntry={openEntry} onDirty={setDirty} /></Suspense> : stage === "woche" ? <Suspense fallback={<Loading text="Woche wird geöffnet …" />}><WeekView key={knowledgeKey} campaign={campaign} userId={me.userId} liveRevision={revision + live.revision} onDirty={setDirty} onOpenEntry={openEntry} onOpenDoors={openDoors} composeSeed={composeSeed} /></Suspense> : stage === "schmiede" ? campaign.role === "leitung" ? <Suspense fallback={<Loading text="Schmiede wird geöffnet …" />}><RuleForge key={campaign.id} campaign={campaign} authorName={me.displayName} liveRevision={revision + live.revision} onDirty={setDirty} onChanged={() => setRevision(value => value + 1)} /></Suspense> : <EmptyState title="Die Schmiede gehört der Spielleitung.">Die aktiven Regeln findest du am Tisch.</EmptyState> : stage === "kanal" ? <Suspense fallback={<Loading text="Kanal wird geöffnet …" />}><ChannelView key={campaign.id} campaign={campaign} userId={me.userId} live={live} onDirty={setDirty} /></Suspense> : null}
      </main></div><footer className="band"><span className="band-mark" aria-hidden="true">✧</span><span>{campaign?.name ?? "Atlas Chronicles"}</span>{campaign ? <span role="status" aria-label="Live-Verbindung" data-live-state={live.status} title={live.presence.map(person => person.displayName).join(", ")}>{liveStatusLabel[live.status]}</span> : null}{campaign ? <Suspense fallback={null}><MediaPanel key={`${campaign.id}:${me.userId}`} campaign={campaign} userId={me.userId} livePresence={live.presence} /></Suspense> : null}<span className="band-status">{dirty ? "Ungespeicherter Entwurf" : me.displayName}</span><span className="role-chip">{campaign?.role === "leitung" ? "Spielleitung" : campaign?.role === "spieler" ? "Spieler" : "Chronicle"}</span></footer>
  </div>;
}
