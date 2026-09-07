// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import { Check, MessageCircle, RefreshCw, Reply, Send, Trash2, Users, X } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText, type Campaign } from "../api";
import { useTask } from "../hooks";
import type { SceneCard } from "./game-api";
import { liveStatusLabel, type CampaignLive, type CampaignMessageDraft } from "./useCampaignLive";
import "./ChannelView.css";

interface Message { id: string; authorName: string; userId: string; body: string; parentId: string | null; kind: "letter" | "table"; createdAt: string | number }
interface Draft { text: string; reply: Message | null; expectedScene?: { id: string; version: number } }
const emptyDraft = (): Draft => ({ text: "", reply: null });

/** Retain the current list while refreshing, but never carry it to another campaign/channel. */
function useChannelResource<T>(path: string, revision: number) {
  const [state, setState] = useState<{ path: string; data: T | null; error: string; loading: boolean }>({ path, data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState(value => value.path === path ? { ...value, error: "", loading: value.data === null } : { path, data: null, error: "", loading: true });
    void api<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, data, error: "", loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setState(value => ({ path, data: error instanceof ApiError && [401, 403, 404].includes(error.status) ? null : value.path === path ? value.data : null, error: errorText(error), loading: false }));
    });
    return () => controller.abort();
  }, [path, revision]);
  return state.path === path ? state : { path, data: null, error: "", loading: true };
}

export function ChannelView({ campaign, userId, live, onDirty }: { campaign: Campaign; userId: string; live: CampaignLive; onDirty?: (dirty: boolean) => void }) {
  return <CampaignChannel key={`${campaign.id}/${userId}`} campaign={campaign} userId={userId} live={live} {...(onDirty ? { onDirty } : {})} />;
}

function CampaignChannel({ campaign, userId, live, onDirty }: { campaign: Campaign; userId: string; live: CampaignLive; onDirty?: (dirty: boolean) => void }) {
  const [kind, setKind] = useState<CampaignMessageDraft["kind"]>("letter");
  const [drafts, setDrafts] = useState<Record<"letter" | "table", Draft>>({ letter: emptyDraft(), table: emptyDraft() });
  const [notice, setNotice] = useState(""), [deleting, setDeleting] = useState<string | null>(null);
  const [localRevision, setLocalRevision] = useState(0);
  const task = useTask(), textarea = useRef<HTMLTextAreaElement>(null), sending = useRef(false);
  const everConnected = useRef(false), droppedSinceConnected = useRef(false);
  const [justReconnected, setJustReconnected] = useState(false);
  // Only flag a real reconnect (drop after being live), never the initial handshake.
  useEffect(() => {
    if (live.status === "connected") {
      if (droppedSinceConnected.current) setJustReconnected(true);
      droppedSinceConnected.current = false;
      everConnected.current = true;
    } else if (everConnected.current) droppedSinceConnected.current = true;
  }, [live.status]);
  useEffect(() => {
    if (!justReconnected) return;
    const timer = setTimeout(() => setJustReconnected(false), 9000);
    return () => clearTimeout(timer);
  }, [justReconnected]);
  const revision = live.revision + localRevision, draft = drafts[kind];
  const messages = useChannelResource<Message[]>(apiPath(campaign.id, `/messages?kind=${kind}`), revision);
  const scenes = useChannelResource<SceneCard[]>(apiPath(campaign.id, "/scenes"), revision);
  const active = scenes.data?.find(scene => scene.status === "active");
  const sceneChanged = kind === "table" && !!draft.expectedScene && (!active || draft.expectedScene.id !== active.id || draft.expectedScene.version !== active.version);
  const canWrite = campaign.role === "leitung" || campaign.role === "spieler";
  const dirty = !!(drafts.letter.text || drafts.table.text);
  useEffect(() => { onDirty?.(dirty); return () => onDirty?.(false); }, [dirty, onDirty]);
  const refresh = () => { setLocalRevision(value => value + 1); live.refresh(); };
  const patchDraft = (patch: Partial<Draft>) => setDrafts(value => ({ ...value, [kind]: {
    ...value[kind], ...patch,
    ...(kind === "table" && !value[kind].expectedScene && active && (patch.text || patch.reply) ? { expectedScene: { id: active.id, version: active.version } } : {}),
  } }));
  const changeChannel = (next: typeof kind) => { setKind(next); setNotice(""); task.setError(""); setDeleting(null); };
  const replyTo = (message: Message) => { patchDraft({ reply: message }); textarea.current?.focus(); };
  const submit = () => {
    if (sending.current || !draft.text.trim() || !canWrite || (kind === "table" && (!active || !draft.expectedScene || sceneChanged))) return;
    const sentKind = kind, sentDraft = draft;
    sending.current = true;
    void task.run(async () => {
      try {
        await live.sendMessage({ kind: sentKind, body: sentDraft.text, ...(sentDraft.reply ? { parentId: sentDraft.reply.id } : {}), ...(sentDraft.expectedScene ? { expectedScene: sentDraft.expectedScene } : {}) });
        setDrafts(value => ({ ...value, [sentKind]: value[sentKind] === sentDraft ? emptyDraft() : value[sentKind] }));
        setNotice(sentKind === "letter" ? "Dein Beitrag wurde in der Kampagne gespeichert." : "Deine Nachricht wurde am laufenden Tisch zugestellt.");
        refresh(); textarea.current?.focus();
      } catch (error) {
        if (sentKind === "table" && error instanceof ApiError && error.status === 409) {
          refresh();
          throw new Error("Die Szene oder Nachricht hat sich inzwischen geändert. Der Tischchat wird aktualisiert; dein Entwurf bleibt erhalten.");
        }
        throw error;
      } finally { sending.current = false; }
    });
  };
  const byId = new Map(messages.data?.map(message => [message.id, message]));
  const liveMatches = live.campaignId === campaign.id;
  return <section className="page-content channel-page">
    <div className="page-heading"><div><p className="eyebrow">Die Stimmen eurer Runde</p><h1>Kampagnenkanal</h1><p className="muted">{campaign.name}</p></div><Button aria-label="Kanal aktualisieren" onClick={refresh}><RefreshCw size={17} /></Button></div>
    <div className="channel-connection" role="status"><span className={`channel-connection-dot ${live.status}`} aria-hidden="true" /><span>{liveStatusLabel[live.status]}</span>{live.status !== "connected" && live.status !== "idle" ? <Button variant="quiet" onClick={live.retry}>Erneut verbinden</Button> : null}</div>
    {live.error ? <Notice error>{live.error}</Notice> : live.status !== "connected" ? <p className="field-help">Neue Beiträge und Anwesenheit werden nach dem Verbinden aktualisiert. Du kannst den Kanal auch manuell aktualisieren.</p> : justReconnected ? <Notice>Die Verbindung war unterbrochen und ist jetzt wieder da. Der Kanal wurde automatisch aktualisiert und ist wieder aktuell.<Button variant="quiet" onClick={() => setJustReconnected(false)}>Verstanden</Button></Notice> : null}
    <nav className="channel-tabs" aria-label="Nachrichtenbereich"><button type="button" disabled={task.busy} aria-pressed={kind === "letter"} onClick={() => changeChannel("letter")}><MessageCircle size={16} /> Kampagnenbeiträge</button><button type="button" disabled={task.busy} aria-pressed={kind === "table"} onClick={() => changeChannel("table")}><Users size={16} /> Tischchat</button></nav>
    <p className="channel-retention" id="channel-retention">{kind === "letter" ? "Diese ausdrücklich verfassten Beiträge und Antworten bleiben in eurer Kampagne gespeichert. Alle Mitglieder können sie lesen." : "Der Tischchat gehört zur laufenden Szene. Beim Szenenwechsel verschwindet er; spätestens nach 14 Tagen wird er gelöscht. Wichtige Absprachen kannst du ausdrücklich als Kampagnenbeitrag verfassen."}</p>
    <div className="channel-layout"><div className="channel-conversation">
      {kind === "table" ? <div className="channel-session">{scenes.loading ? "Laufender Tisch wird geprüft …" : active ? <>Am Tisch: <strong>{active.name}</strong> · {active.fictionDate}</> : "Gerade ist keine Szene eröffnet. Die Spielleitung kann am Tisch eine Szene beginnen."}</div> : null}
      {messages.error || (kind === "table" && scenes.error) ? <Notice error>{messages.error || scenes.error}<Button onClick={refresh}>Erneut laden</Button></Notice> : null}
      {messages.loading ? <Loading text="Nachrichten werden geladen …" /> : messages.data?.length ? <ol className="channel-messages" aria-label={kind === "letter" ? "Kampagnenbeiträge" : "Nachrichten am Tisch"}>
        {messages.data.map(message => {
          const parent = message.parentId ? byId.get(message.parentId) : null;
          const timestamp = new Date(Number(message.createdAt));
          return <li className="channel-message" id={`channel-message-${message.id}`} key={message.id}><article>
            <header><span className="avatar" aria-hidden="true">{message.authorName.slice(0, 1).toUpperCase()}</span><div><strong>{message.authorName}{message.userId === userId ? " · du" : ""}</strong><time dateTime={timestamp.toISOString()}>{timestamp.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</time><span className="channel-message-kind" title={kind === "table" ? "Tischchat verschwindet mit der Szene, spätestens nach 14 Tagen." : "Kampagnenbeiträge bleiben dauerhaft in eurer Kampagne erhalten."}> · {kind === "table" ? "flüchtig" : "bleibend"}</span></div></header>
            {message.parentId ? <div className="channel-parent">{parent ? <a href={`#channel-message-${parent.id}`}>Antwort auf {parent.authorName}: {parent.body.slice(0, 140)}{parent.body.length > 140 ? " …" : ""}</a> : "Antwort auf einen nicht mehr verfügbaren Beitrag"}</div> : null}
            <p className="channel-message-body">{message.body}</p>
            <div className="channel-message-actions">{canWrite ? <Button variant="quiet" disabled={task.busy || (kind === "table" && !active)} aria-label={`Auf Beitrag von ${message.authorName} antworten`} onClick={() => replyTo(message)}><Reply size={14} /> Antworten</Button> : null}{campaign.role === "leitung" || message.userId === userId ? <Button variant="quiet" disabled={task.busy} aria-label={`Beitrag von ${message.authorName} löschen`} onClick={() => setDeleting(message.id)}><Trash2 size={14} /> Löschen</Button> : null}</div>
            {deleting === message.id ? <div className="channel-delete"><p>Diesen Beitrag für die Runde entfernen?</p><div className="button-row"><Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => { await api(apiPath(campaign.id, `/messages/${encodeURIComponent(message.id)}`), { method: "DELETE" }); setDeleting(null); setNotice("Der Beitrag wurde entfernt."); refresh(); })}><Check size={14} /> Beitrag entfernen</Button><Button disabled={task.busy} onClick={() => setDeleting(null)}>Abbrechen</Button></div></div> : null}
          </article></li>;
        })}
      </ol> : !messages.error ? <EmptyState title={kind === "letter" ? "Was möchtet ihr miteinander teilen?" : "Ein neuer Abend, ein leeres Blatt."} action={canWrite && (kind === "letter" || active) ? <Button variant="primary" onClick={() => textarea.current?.focus()}><Send size={16} /> {kind === "letter" ? "Ersten Beitrag schreiben" : "Erste Nachricht schreiben"}</Button> : undefined}>{kind === "letter" ? "Hier ist Platz für Absprachen, Fragen und Nachrichten zwischen euren Abenden." : "Kurze Nachrichten begleiten die laufende Szene. Dieser Chat wird kein dauerhaftes Sitzungsprotokoll."}</EmptyState> : null}
      {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
      {canWrite ? <form className="panel channel-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
        {sceneChanged ? <Notice error>Dieser Entwurf gehört zu einer anderen Szene. Sein Text bleibt zum Kopieren erhalten. Verwirf ihn ausdrücklich, bevor du eine Nachricht für die neue Szene beginnst.<Button disabled={task.busy} onClick={() => { setDrafts(value => ({ ...value, table: emptyDraft() })); task.setError(""); textarea.current?.focus(); }}>Entwurf verwerfen</Button></Notice> : null}
        {draft.reply ? <div className="channel-reply-draft"><span>Antwort an <strong>{draft.reply.authorName}</strong>: {draft.reply.body.slice(0, 120)}</span><Button variant="quiet" disabled={task.busy} aria-label="Antwortbezug entfernen" onClick={() => patchDraft({ reply: null })}><X size={15} /></Button></div> : null}
        <label htmlFor="channel-message-draft">{kind === "letter" ? "Nachricht an die Kampagne" : "Nachricht an den Tisch"}</label><textarea id="channel-message-draft" ref={textarea} value={draft.text} rows={4} maxLength={8000} aria-describedby="channel-retention" disabled={task.busy || (kind === "table" && !active && !draft.text)} readOnly={sceneChanged} onChange={event => patchDraft({ text: event.target.value })} placeholder={kind === "letter" ? "Was steht für eure Runde an?" : "Eine Nachricht für die laufende Szene …"} required />
        <div className="channel-composer-footer"><span className="field-help">{draft.text.length} / 8000 Zeichen</span><Button type="submit" variant="primary" disabled={task.busy || !draft.text.trim() || !liveMatches || live.status === "unavailable" || (kind === "table" && (!active || !!scenes.error || !draft.expectedScene || sceneChanged))}><Send size={16} /> {task.busy ? "Wird bestätigt …" : kind === "letter" ? "Beitrag veröffentlichen" : "Am Tisch senden"}</Button></div>
      </form> : <p className="field-help">Als Beobachter kannst du die Nachrichten der Runde lesen.</p>}
    </div><aside className="channel-presence panel" aria-label="Anwesenheit im Kampagnenkanal"><details open><summary><h2><Users size={18} /> Gerade verbunden</h2></summary>{live.status !== "connected" || !liveMatches ? <p className="muted">Anwesenheit wird nach dem Verbinden bestätigt.</p> : live.presence.length ? <ul>{live.presence.map(member => <li key={member.userId}><span className={`channel-presence-dot ${member.state}`} aria-hidden="true" /><div><strong>{member.displayName}{member.userId === userId ? " · du" : ""}</strong><small>{member.state === "online" ? "Online" : "Abwesend"}</small></div></li>)}</ul> : <p className="muted">Der Server meldet gerade keine verbundenen Personen.</p>}<p className="field-help">Diese Anzeige beschreibt die App-Verbindung. Mikrofon und Kamera haben einen eigenen Verbindungszustand.</p></details></aside></div>
  </section>;
}
