// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import { Check, MessageCircle, RefreshCw, Reply, Send, Trash2, Users, X } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText, type Campaign } from "../api";
import { useTask } from "../hooks";
import type { SceneCard } from "./game-api";
import { LIVE_STATUS_LABEL, type CampaignLive, type CampaignMessageDraft } from "./useCampaignLive";
import { locale, t } from "../i18n";
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
        setNotice(sentKind === "letter" ? t("Dein Beitrag wurde in der Kampagne gespeichert.") : t("Deine Nachricht wurde am laufenden Tisch zugestellt."));
        refresh(); textarea.current?.focus();
      } catch (error) {
        if (sentKind === "table" && error instanceof ApiError && error.status === 409) {
          refresh();
          throw new Error(t("Die Szene oder Nachricht hat sich inzwischen geändert. Der Tischchat wird aktualisiert; dein Entwurf bleibt erhalten."));
        }
        throw error;
      } finally { sending.current = false; }
    });
  };
  const byId = new Map(messages.data?.map(message => [message.id, message]));
  const liveMatches = live.campaignId === campaign.id;
  return <section className="page-content channel-page">
    <div className="page-heading"><div><p className="eyebrow">{t("Die Stimmen eurer Runde")}</p><h1>{t("Kampagnenkanal")}</h1><p className="muted">{campaign.name}</p></div><Button aria-label={t("Kanal aktualisieren")} onClick={refresh}><RefreshCw size={17} /></Button></div>
    <div className="channel-connection" role="status"><span className={`channel-connection-dot ${live.status}`} aria-hidden="true" /><span>{t(LIVE_STATUS_LABEL[live.status])}</span>{live.status !== "connected" && live.status !== "idle" ? <Button variant="quiet" onClick={live.retry}>{t("Erneut verbinden")}</Button> : null}</div>
    {live.error ? <Notice error>{live.error}</Notice> : live.status !== "connected" ? <p className="field-help">{t("Neue Beiträge und Anwesenheit werden nach dem Verbinden aktualisiert. Du kannst den Kanal auch manuell aktualisieren.")}</p> : justReconnected ? <Notice>{t("Die Verbindung war unterbrochen und ist jetzt wieder da. Der Kanal wurde automatisch aktualisiert und ist wieder aktuell.")}<Button variant="quiet" onClick={() => setJustReconnected(false)}>{t("Verstanden")}</Button></Notice> : null}
    <nav className="channel-tabs" aria-label={t("Nachrichtenbereich")}><button type="button" disabled={task.busy} aria-pressed={kind === "letter"} onClick={() => changeChannel("letter")}><MessageCircle size={16} /> {t("Kampagnenbeiträge")}</button><button type="button" disabled={task.busy} aria-pressed={kind === "table"} onClick={() => changeChannel("table")}><Users size={16} /> {t("Tischchat")}</button></nav>
    <p className="channel-retention" id="channel-retention">{kind === "letter" ? t("Diese ausdrücklich verfassten Beiträge und Antworten bleiben in eurer Kampagne gespeichert. Alle Mitglieder können sie lesen.") : t("Der Tischchat gehört zur laufenden Szene. Beim Szenenwechsel verschwindet er; spätestens nach 14 Tagen wird er gelöscht. Wichtige Absprachen kannst du ausdrücklich als Kampagnenbeitrag verfassen.")}</p>
    <div className="channel-layout"><div className="channel-conversation">
      {kind === "table" ? <div className="channel-session">{scenes.loading ? t("Laufender Tisch wird geprüft …") : active ? <>{t("Am Tisch:")} <strong>{active.name}</strong> · {active.fictionDate}</> : t("Gerade ist keine Szene eröffnet. Die Spielleitung kann am Tisch eine Szene beginnen.")}</div> : null}
      {messages.error || (kind === "table" && scenes.error) ? <Notice error>{messages.error || scenes.error}<Button onClick={refresh}>{t("Erneut laden")}</Button></Notice> : null}
      {messages.loading ? <Loading text={t("Nachrichten werden geladen …")} /> : messages.data?.length ? <ol className="channel-messages" aria-label={kind === "letter" ? t("Kampagnenbeiträge") : t("Nachrichten am Tisch")}>
        {messages.data.map(message => {
          const parent = message.parentId ? byId.get(message.parentId) : null;
          const timestamp = new Date(Number(message.createdAt));
          return <li className="channel-message" id={`channel-message-${message.id}`} key={message.id}><article>
            <header><span className="avatar" aria-hidden="true">{message.authorName.slice(0, 1).toUpperCase()}</span><div><strong>{message.authorName}{message.userId === userId ? ` · ${t("du")}` : ""}</strong><time dateTime={timestamp.toISOString()}>{timestamp.toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" })}</time><span className="channel-message-kind" title={kind === "table" ? t("Tischchat verschwindet mit der Szene, spätestens nach 14 Tagen.") : t("Kampagnenbeiträge bleiben dauerhaft in eurer Kampagne erhalten.")}> · {kind === "table" ? t("flüchtig") : t("bleibend")}</span></div></header>
            {message.parentId ? <div className="channel-parent">{parent ? <a href={`#channel-message-${parent.id}`}>{t("Antwort auf {name}", { name: parent.authorName })}: {parent.body.slice(0, 140)}{parent.body.length > 140 ? " …" : ""}</a> : t("Antwort auf einen nicht mehr verfügbaren Beitrag")}</div> : null}
            <p className="channel-message-body">{message.body}</p>
            <div className="channel-message-actions">{canWrite ? <Button variant="quiet" disabled={task.busy || (kind === "table" && !active)} aria-label={t("Auf Beitrag von {name} antworten", { name: message.authorName })} onClick={() => replyTo(message)}><Reply size={14} /> {t("Antworten")}</Button> : null}{campaign.role === "leitung" || message.userId === userId ? <Button variant="quiet" disabled={task.busy} aria-label={t("Beitrag von {name} löschen", { name: message.authorName })} onClick={() => setDeleting(message.id)}><Trash2 size={14} /> {t("Löschen")}</Button> : null}</div>
            {deleting === message.id ? <div className="channel-delete"><p>{t("Diesen Beitrag für die Runde entfernen?")}</p><div className="button-row"><Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => { await api(apiPath(campaign.id, `/messages/${encodeURIComponent(message.id)}`), { method: "DELETE" }); setDeleting(null); setNotice(t("Der Beitrag wurde entfernt.")); refresh(); })}><Check size={14} /> {t("Beitrag entfernen")}</Button><Button disabled={task.busy} onClick={() => setDeleting(null)}>{t("Abbrechen")}</Button></div></div> : null}
          </article></li>;
        })}
      </ol> : !messages.error ? <EmptyState title={kind === "letter" ? t("Was möchtet ihr miteinander teilen?") : t("Ein neuer Abend, ein leeres Blatt.")} action={canWrite && (kind === "letter" || active) ? <Button variant="primary" onClick={() => textarea.current?.focus()}><Send size={16} /> {kind === "letter" ? t("Ersten Beitrag schreiben") : t("Erste Nachricht schreiben")}</Button> : undefined}>{kind === "letter" ? t("Hier ist Platz für Absprachen, Fragen und Nachrichten zwischen euren Abenden.") : t("Kurze Nachrichten begleiten die laufende Szene. Dieser Chat wird kein dauerhaftes Sitzungsprotokoll.")}</EmptyState> : null}
      {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
      {canWrite ? <form className="panel channel-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
        {sceneChanged ? <Notice error>{t("Dieser Entwurf gehört zu einer anderen Szene. Sein Text bleibt zum Kopieren erhalten. Verwirf ihn ausdrücklich, bevor du eine Nachricht für die neue Szene beginnst.")}<Button disabled={task.busy} onClick={() => { setDrafts(value => ({ ...value, table: emptyDraft() })); task.setError(""); textarea.current?.focus(); }}>{t("Entwurf verwerfen")}</Button></Notice> : null}
        {draft.reply ? <div className="channel-reply-draft"><span>{t("Antwort an")} <strong>{draft.reply.authorName}</strong>: {draft.reply.body.slice(0, 120)}</span><Button variant="quiet" disabled={task.busy} aria-label={t("Antwortbezug entfernen")} onClick={() => patchDraft({ reply: null })}><X size={15} /></Button></div> : null}
        <label htmlFor="channel-message-draft">{kind === "letter" ? t("Nachricht an die Kampagne") : t("Nachricht an den Tisch")}</label><textarea id="channel-message-draft" ref={textarea} value={draft.text} rows={4} maxLength={8000} aria-describedby="channel-retention" disabled={task.busy || (kind === "table" && !active && !draft.text)} readOnly={sceneChanged} onChange={event => patchDraft({ text: event.target.value })} placeholder={kind === "letter" ? t("Was steht für eure Runde an?") : t("Eine Nachricht für die laufende Szene …")} required />
        <div className="channel-composer-footer"><span className="field-help">{t("{anzahl} / 8000 Zeichen", { anzahl: draft.text.length })}</span><Button type="submit" variant="primary" disabled={task.busy || !draft.text.trim() || !liveMatches || live.status === "unavailable" || (kind === "table" && (!active || !!scenes.error || !draft.expectedScene || sceneChanged))}><Send size={16} /> {task.busy ? t("Wird bestätigt …") : kind === "letter" ? t("Beitrag veröffentlichen") : t("Am Tisch senden")}</Button></div>
      </form> : <p className="field-help">{t("Als Beobachter kannst du die Nachrichten der Runde lesen.")}</p>}
    </div><aside className="channel-presence panel" aria-label={t("Anwesenheit im Kampagnenkanal")}><details open><summary><h2><Users size={18} /> {t("Gerade verbunden")}</h2></summary>{live.status !== "connected" || !liveMatches ? <p className="muted">{t("Anwesenheit wird nach dem Verbinden bestätigt.")}</p> : live.presence.length ? <ul>{live.presence.map(member => <li key={member.userId}><span className={`channel-presence-dot ${member.state}`} aria-hidden="true" /><div><strong>{member.displayName}{member.userId === userId ? ` · ${t("du")}` : ""}</strong><small>{member.state === "online" ? t("Online") : t("Abwesend")}</small></div></li>)}</ul> : <p className="muted">{t("Der Server meldet gerade keine verbundenen Personen.")}</p>}<p className="field-help">{t("Hier siehst du, wer mit der Runde verbunden oder gerade abwesend ist.")}</p></details></aside></div>
  </section>;
}
