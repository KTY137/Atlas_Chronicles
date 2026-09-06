import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConnectionState, Room, RoomEvent, Track, type Participant } from "livekit-client";
import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, Phone, PhoneOff, Settings2, Video, VideoOff, X } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, type Campaign, type Member } from "../api";
import { useResource } from "../hooks";
import type { CampaignPresence } from "./useCampaignLive";
import "./MediaPanel.css";

interface MediaRoom { id: string; kind: "table" | "whisper"; generation: number; memberIds: string[] }
interface MediaStatus {
  configured: boolean; sessionId: string | null; rooms: MediaRoom[];
  presence: { userId: string; roomId: string; state: "joining" | "connected" }[];
  blocked: boolean; cleanupPending: boolean; blockedMemberIds?: string[];
}
interface Admission { roomId: string; kind: MediaRoom["kind"]; generation: number; canPublish: boolean }
interface TokenResponse extends Admission { token: string; url: string; expiresIn: number }
type MediaState = "idle" | "joining" | "confirming" | "connected" | "reconnecting" | "unavailable";
const stateLabels: Record<MediaState, string> = {
  idle: "Sprache nicht verbunden", joining: "Sprachraum wird verbunden", confirming: "Anwesenheit wird bestätigt",
  connected: "Sprache verbunden", reconnecting: "Sprache verbindet erneut", unavailable: "Sprache unterbrochen",
};
const qualityLabels: Record<string, string> = { excellent: "Sehr gut", good: "Gut", poor: "Schwach", lost: "Unterbrochen", unknown: "Wird ermittelt" };
function failureText(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return "Dein Zugang oder dieser Sprachraum ist nicht mehr verfügbar. Prüfe die aktuelle Runde.";
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Die Freigabe wurde abgelehnt. Du kannst weiter zuhören und Mikrofon oder Kamera später in den Browsereinstellungen erlauben.";
  if (error instanceof DOMException && error.name === "NotFoundError") return "Das gewählte Mikrofon oder die Kamera wurde nicht gefunden. Wähle ein verfügbares Gerät.";
  if (error instanceof DOMException && error.name === "NotReadableError") return "Das Gerät kann gerade nicht geöffnet werden. Prüfe, ob es in einer anderen Anwendung verwendet wird.";
  return "Sprache ist gerade nicht verfügbar. Der Spieltisch bleibt erreichbar. Du kannst die Verbindung erneut versuchen.";
}

function TrackElement({ track, muted = false }: { track: Track; muted?: boolean }) {
  const element = useRef<HTMLMediaElement | null>(null);
  useEffect(() => {
    const target = element.current; if (!target) return;
    track.attach(target);
    return () => { track.detach(target); target.srcObject = null; };
  }, [track]);
  useEffect(() => { if (element.current) element.current.muted = muted; }, [track, muted]);
  return track.kind === Track.Kind.Video
    ? <video ref={node => { element.current = node; }} autoPlay playsInline muted={muted} />
    : <audio ref={node => { element.current = node; }} autoPlay muted={muted} />;
}

/** Lives in the authenticated shell, independently of the currently displayed stage. */
export function MediaPanel({ campaign, userId, livePresence = [] }: {
  campaign: Campaign; userId: string; livePresence?: readonly CampaignPresence[];
}) {
  const panelId = useId(), base = apiPath(campaign.id, "/media");
  const [revision, setRevision] = useState(0), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const status = useResource<MediaStatus>(base, revision, 5000);
  const roster = useResource<Member[]>(apiPath(campaign.id, "/roster"), revision, 15_000);
  const [connection, setConnection] = useState<MediaState>("idle"), [error, setError] = useState("");
  const [room, setRoom] = useState<Room | null>(null), [admission, setAdmission] = useState<Admission | null>(null);
  const [, setRoomRevision] = useState(0), [deafened, setDeafened] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[] | null>(null), [invited, setInvited] = useState<string[]>([]);
  const trigger = useRef<HTMLButtonElement | null>(null), panel = useRef<HTMLElement | null>(null);
  const mounted = useRef(false), epoch = useRef(0), current = useRef<Room | null>(null);
  const requests = useRef(new Set<AbortController>()), heartbeat = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const admissionSnapshot = useRef<MediaStatus | null>(null), actionRunning = useRef(false);
  const currentStatus = useRef(status.data); currentStatus.current = status.data;
  const refresh = useCallback(() => { if (mounted.current) setRevision(value => value + 1); }, []);
  const request = useCallback(async <T,>(suffix: string, method = "POST", body?: unknown): Promise<T> => {
    if (!mounted.current) throw new DOMException("Media scope is no longer active", "AbortError");
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000);
    requests.current.add(controller);
    try { return await api<T>(base + suffix, { method, ...(body === undefined ? {} : { body }), signal: controller.signal }); }
    finally { clearTimeout(timeout); requests.current.delete(controller); }
  }, [base]);
  const stopLocal = useCallback(async () => {
    clearInterval(heartbeat.current); heartbeat.current = undefined;
    const previous = current.current; current.current = null;
    if (mounted.current) { setRoom(null); setAdmission(null); setConnection("idle"); }
    if (previous) {
      previous.removeAllListeners();
      for (const publication of previous.localParticipant.trackPublications.values()) publication.track?.stop();
      try { await previous.disconnect(true); } catch { /* Capture is stopped even if transport cleanup fails. */ }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; epoch.current++;
      for (const controller of requests.current) controller.abort();
      // Scope changes must stop devices locally even if authenticated HTTP is unavailable.
      // Do not send an old scope's DELETE under a possibly replaced browser identity.
      void stopLocal();
    };
  }, [stopLocal]);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const run = async (work: () => Promise<void>) => {
    if (actionRunning.current) return;
    actionRunning.current = true; setBusy(true); setError("");
    try { await work(); }
    catch (cause) { if (mounted.current) setError(failureText(cause)); }
    finally { actionRunning.current = false; if (mounted.current) setBusy(false); }
  };
  const failConnection = useCallback(async (message: string) => {
    epoch.current++; await stopLocal();
    if (mounted.current) { setConnection("unavailable"); setError(message); }
  }, [stopLocal]);

  async function join(roomId?: string) {
    const attempt = ++epoch.current, previous = current.current;
    await stopLocal();
    if (!mounted.current || attempt !== epoch.current) return;
    if (previous) await request("/presence", "DELETE");
    if (!mounted.current || attempt !== epoch.current) return;
    setConnection("joining");
    let next: Room | undefined;
    try {
      const result = await request<TokenResponse>("/token", "POST", roomId ? { roomId } : {});
      if (!mounted.current || attempt !== epoch.current) return;
      const grant: Admission = { roomId: result.roomId, kind: result.kind, generation: result.generation, canPublish: result.canPublish };
      next = new Room({ adaptiveStream: true, dynacast: true, stopLocalTrackOnUnpublish: true, disconnectOnPageLeave: true, publishDefaults: { stopMicTrackOnMute: true } });
      const activeRoom = next;
      current.current = activeRoom;
      const valid = () => mounted.current && current.current === activeRoom && attempt === epoch.current;
      const update = () => { if (valid()) setRoomRevision(value => value + 1); };
      let confirming = false;
      const confirm = async () => {
        if (!valid() || activeRoom.state !== ConnectionState.Connected || confirming) return;
        confirming = true;
        try {
          await request("/presence", "POST", { roomId: grant.roomId });
          if (valid()) { setConnection("connected"); update(); }
        } catch (cause) { if (valid()) await failConnection(failureText(cause)); }
        finally { confirming = false; }
      };
      activeRoom.on(RoomEvent.ParticipantConnected, update).on(RoomEvent.ParticipantDisconnected, update)
        .on(RoomEvent.TrackSubscribed, update).on(RoomEvent.TrackUnsubscribed, update)
        .on(RoomEvent.TrackSubscriptionFailed, () => { if (valid()) setError("Ein Medienstream konnte nicht empfangen werden. Prüfe die Verbindung oder tritt dem Raum erneut bei."); })
        .on(RoomEvent.TrackPublished, update).on(RoomEvent.TrackUnpublished, update)
        .on(RoomEvent.LocalTrackPublished, update).on(RoomEvent.LocalTrackUnpublished, update)
        .on(RoomEvent.TrackMuted, update).on(RoomEvent.TrackUnmuted, update)
        .on(RoomEvent.ActiveSpeakersChanged, update).on(RoomEvent.ConnectionQualityChanged, update)
        .on(RoomEvent.AudioPlaybackStatusChanged, update).on(RoomEvent.ActiveDeviceChanged, update)
        .on(RoomEvent.MediaDevicesChanged, () => {
          void Room.getLocalDevices(undefined, false).then(list => { if (valid()) setDevices(previous => previous ? list : null); }).catch(() => {});
          update();
        })
        .on(RoomEvent.ParticipantPermissionsChanged, update)
        .on(RoomEvent.Reconnecting, () => { if (valid()) setConnection("reconnecting"); })
        .on(RoomEvent.SignalReconnecting, () => { if (valid()) setConnection("reconnecting"); })
        .on(RoomEvent.Reconnected, () => { if (valid()) { setConnection("confirming"); void confirm(); } })
        .on(RoomEvent.Disconnected, () => {
          if (valid()) { clearInterval(heartbeat.current); setRoom(null); setConnection("unavailable"); setError("Die Sprachverbindung wurde beendet. Der Tisch läuft weiter. Verbinde dich bei Bedarf erneut."); refresh(); }
        })
        .on(RoomEvent.MediaDevicesError, cause => { if (valid()) setError(failureText(cause)); });
      admissionSnapshot.current = currentStatus.current;
      setAdmission(grant); setRoom(activeRoom); setDeafened(false); refresh();
      await activeRoom.connect(result.url, result.token, { autoSubscribe: true, maxRetries: 1, websocketTimeout: 10_000, peerConnectionTimeout: 15_000 });
      if (!valid()) { await activeRoom.disconnect(true); return; }
      setConnection("confirming");
      await confirm();
      if (valid()) heartbeat.current = setInterval(() => { void confirm(); }, 10_000);
    } catch (cause) {
      if (next) { next.removeAllListeners(); await next.disconnect(true); }
      if (mounted.current && attempt === epoch.current) {
        await failConnection(failureText(cause));
        // Remove the joining lease after an unsuccessful connection, without reviving it.
        try { await request("/presence", "DELETE"); } catch { /* The server lease expires independently. */ }
        refresh();
      }
    }
  }
  useEffect(() => {
    if (!admission || !current.current) return;
    if (status.error) { void failConnection("Der Server kann deinen Sprachzugang gerade nicht bestätigen. Der Tisch bleibt erreichbar."); return; }
    const snapshot = status.data;
    if (!snapshot || snapshot === admissionSnapshot.current) return;
    const found = snapshot.rooms.find(item => item.id === admission.roomId);
    if (snapshot.blocked || !snapshot.sessionId || !found || found.generation !== admission.generation)
      void failConnection(snapshot.blocked ? "Dein Sprachzugang wurde gesperrt." : "Die Sitzung oder der Sprachraum hat sich geändert. Verbinde dich erneut mit einem verfügbaren Raum.");
  }, [status.data, status.error, admission, failConnection]);

  const connected = connection === "connected" && room?.state === ConnectionState.Connected;
  const canPublish = !!connected && !!admission?.canPublish && campaign.role !== "beobachter";
  const tableMedia = admission?.kind === "table";
  const local = room?.localParticipant;
  const peers: Participant[] = connected && room ? [room.localParticipant, ...room.remoteParticipants.values()] : [];
  const audioTracks = room ? [...room.remoteParticipants.values()].flatMap(person => person.getTrackPublications()
    .filter(publication => publication.kind === Track.Kind.Audio && publication.track).map(publication => publication.track!)) : [];
  const canJoin = !!status.data?.configured && !!status.data.sessionId && !status.data.blocked && !status.data.cleanupPending && !status.error && !busy;
  const members = roster.data ?? [], name = (id: string) => members.find(person => person.userId === id)?.displayName ?? "Mitglied der Runde";
  const isGm = campaign.role === "leitung", blocked = new Set(status.data?.blockedMemberIds ?? []);
  const whispers = status.data?.rooms.filter(item => item.kind === "whisper") ?? [];
  async function toggle(source: "mic" | "camera" | "screen") {
    const activeRoom = current.current; if (!activeRoom || !canPublish) return;
    if (source === "mic") await activeRoom.localParticipant.setMicrophoneEnabled(!activeRoom.localParticipant.isMicrophoneEnabled);
    if (source === "camera" && tableMedia) await activeRoom.localParticipant.setCameraEnabled(!activeRoom.localParticipant.isCameraEnabled);
    if (source === "screen" && tableMedia) await activeRoom.localParticipant.setScreenShareEnabled(!activeRoom.localParticipant.isScreenShareEnabled, { audio: true });
    if (mounted.current && current.current === activeRoom) { setRoomRevision(value => value + 1); if (devices) setDevices(await Room.getLocalDevices(undefined, false)); }
  }
  async function mutate(suffix: string, method: string, body?: unknown) {
    try { await request(suffix, method, body); } finally { refresh(); }
  }
  const controls = <>
    <Button variant="quiet" aria-label={local?.isMicrophoneEnabled ? "Mikrofon ausschalten" : "Mikrofon einschalten"} aria-pressed={!!local?.isMicrophoneEnabled} disabled={!canPublish || busy} onClick={() => void run(() => toggle("mic"))}>{local?.isMicrophoneEnabled ? <Mic size={16} /> : <MicOff size={16} />}</Button>
    <Button variant="quiet" aria-label={deafened ? "Ton einschalten" : "Ton ausschalten"} aria-pressed={deafened} disabled={!connected} onClick={() => setDeafened(value => !value)}>{deafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}</Button>
  </>;
  return <>
    <div className="media-band" aria-label="Sprache und Video">
      <button ref={trigger} type="button" className="button button-quiet media-open" aria-label="Sprache und Video öffnen" aria-controls={panelId} aria-expanded={open} onClick={() => setOpen(value => !value)}><Headphones size={16} /><span>{admission?.kind === "whisper" && connected ? "Im Flüsterraum" : connected ? "Sprache verbunden" : "Sprache & Video"}</span>{livePresence.length ? <small aria-label={`${livePresence.length} in der App anwesend`}>{livePresence.length}</small> : null}</button>
      <span className={`media-connection-dot ${connection}`} role="status" aria-label={stateLabels[connection]} />
      <span className="media-band-peers">{peers.slice(0, 4).map(person => <span key={person.identity} className={`media-band-peer ${person.isSpeaking ? "speaking" : ""}`} title={`${person.name || name(person.identity)}${person.isSpeaking ? " spricht" : " im Sprachraum"}`}>{(person.name || name(person.identity)).slice(0, 1).toUpperCase()}</span>)}</span>
      {controls}
      {whispers.some(item => status.data?.presence.some(person => person.roomId === item.id && person.state === "connected")) ? <span className="media-whisper-indicator" title={status.data?.presence.filter(person => person.state === "connected" && whispers.some(item => item.id === person.roomId)).map(person => name(person.userId)).join(", ")}>Flüstern</span> : null}
    </div>
    <div className="media-audio" aria-hidden="true">{audioTracks.map(track => <TrackElement key={track.sid ?? track.mediaStreamTrack.id} track={track} muted={deafened} />)}</div>
    {open ? createPortal(<section id={panelId} ref={panel} tabIndex={-1} className="media-panel" aria-label="Sprache und Video" data-instrument="media">
      <header className="media-heading"><div><p className="eyebrow">Gemeinsam am Tisch</p><h2>Sprache & Video</h2></div><Button variant="quiet" aria-label="Medienbereich schließen" onClick={() => setOpen(false)}><X size={18} /></Button></header>
      <p className="media-state" role="status">{stateLabels[connection]}{connected && admission?.kind === "whisper" ? " · Privater Flüsterraum" : ""}</p>
      {error ? <Notice error>{error}</Notice> : null}
      {status.error ? <Notice error>Der Medienstatus ist nicht erreichbar. Der Spieltisch bleibt unabhängig davon verfügbar.</Notice> : null}
      {!status.loading && status.data && !status.data.configured ? <Notice>Sprache und Video sind auf diesem Server nicht eingerichtet. Du kannst den Tisch und die Nachrichten weiter nutzen.</Notice> : null}
      {status.data?.configured && !status.data.sessionId ? <p className="muted">Die Spielleitung öffnet den Sprachraum, indem sie eine Szene am Tisch startet.</p> : null}
      {status.data?.blocked ? <Notice error>Die Spielleitung hat deinen Sprachzugang gesperrt.</Notice> : null}
      {status.data?.cleanupPending ? <Notice error>Ein Sprachraum wird noch geschlossen. Neue Verbindungen warten auf die Bestätigung des Mediendienstes.</Notice> : null}
      <div className="media-actions">
        {!connected ? <Button variant="primary" disabled={!canJoin} onClick={() => void run(() => join())}><Phone size={16} /> Sprachraum beitreten</Button> : <Button disabled={busy} onClick={() => void run(async () => { epoch.current++; await stopLocal(); await mutate("/presence", "DELETE"); })}><PhoneOff size={16} /> Verbindung verlassen</Button>}
        {admission?.kind === "whisper" && connected ? <Button disabled={busy} onClick={() => void run(() => join())}>Zurück zum Tisch</Button> : null}
        {controls}
        <Button aria-label={local?.isCameraEnabled ? "Kamera ausschalten" : "Kamera einschalten"} aria-pressed={!!local?.isCameraEnabled} disabled={!canPublish || !tableMedia || busy} onClick={() => void run(() => toggle("camera"))}>{local?.isCameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}</Button>
        <Button aria-label={local?.isScreenShareEnabled ? "Bildschirmfreigabe beenden" : "Bildschirm teilen"} aria-pressed={!!local?.isScreenShareEnabled} disabled={!canPublish || !tableMedia || busy} onClick={() => void run(() => toggle("screen"))}><MonitorUp size={16} /></Button>
      </div>
      {connected && room && !room.canPlaybackAudio ? <Notice>Der Browser wartet auf deine Freigabe für die Wiedergabe.<Button onClick={() => void run(async () => { await room.startAudio(); setRoomRevision(value => value + 1); })}>Tonwiedergabe erlauben</Button></Notice> : null}
      {campaign.role === "beobachter" || (admission && !admission.canPublish) ? <p className="field-help">Als Beobachter hörst und siehst du mit. Du sendest weder Mikrofon noch Kamera.</p> : <p className="field-help">Du trittst mit ausgeschaltetem Mikrofon und ausgeschalteter Kamera bei. Im Flüsterraum wird ausschließlich Sprache übertragen.</p>}
      {peers.length ? <div className="media-peers" aria-label="Teilnehmer im verbundenen Sprachraum">{peers.map(person => <article key={person.identity} className={`media-peer ${person.isSpeaking ? "speaking" : ""}`}>
        <div className="media-peer-label"><span className="media-avatar" aria-hidden="true">{(person.name || name(person.identity)).slice(0, 1).toUpperCase()}</span><strong>{person.name || name(person.identity)}{person.identity === userId ? " · du" : ""}</strong>{person.isMicrophoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}</div>
        <small>{person.isSpeaking ? "Spricht gerade · " : ""}{qualityLabels[person.connectionQuality] ?? "Wird ermittelt"}</small>
        {person.getTrackPublications().filter(publication => publication.kind === Track.Kind.Video && publication.track && !publication.isMuted).map(publication => <figure key={publication.trackSid} className={publication.source === Track.Source.ScreenShare ? "media-screen" : "media-camera"}><TrackElement track={publication.track!} muted /><figcaption>{publication.source === Track.Source.ScreenShare ? "Bildschirmfreigabe" : "Kamera"}</figcaption></figure>)}
      </article>)}</div> : null}
      <details className="media-devices" onToggle={event => { if (event.currentTarget.open && !devices) void run(async () => setDevices(await Room.getLocalDevices(undefined, false))); }}><summary><Settings2 size={15} /> Geräte auswählen</summary>
        <p className="field-help">Gerätenamen erscheinen nach deiner Browserfreigabe. Die Geräteübersicht startet keine Aufnahme.</p>
        {(["audioinput", "videoinput", "audiooutput"] as const).map(kind => <label key={kind}>{kind === "audioinput" ? "Mikrofon" : kind === "videoinput" ? "Kamera" : "Lautsprecher"}<select value={room?.getActiveDevice(kind) ?? ""} disabled={!connected || busy || (kind === "audiooutput" && !("setSinkId" in HTMLMediaElement.prototype))} onChange={event => { const deviceId = event.target.value; void run(async () => { if (room && !await room.switchActiveDevice(kind, deviceId)) throw new Error("Device unavailable"); setRoomRevision(value => value + 1); }); }}><option value="">Standardeinstellung</option>{devices?.filter(device => device.kind === kind).map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Gerät ${index + 1}`}</option>)}</select></label>)}
      </details>
      <section className="media-whispers" aria-label="Flüsterräume"><h3>Beiseite sprechen</h3><p className="field-help">Alle sehen, wer beiseite ist. Nur eingeladene Mitglieder können den Flüsterraum hören. Es gibt keine Aufzeichnung.</p>
        {whispers.map(item => <div className="media-whisper" key={item.id}><div><strong>{item.memberIds.map(name).join(" & ")}</strong><small>{status.data?.presence.filter(person => person.roomId === item.id && person.state === "connected").map(person => name(person.userId)).join(", ") || "Noch niemand verbunden"}</small></div><div className="button-row">{item.memberIds.includes(userId) ? <Button disabled={!canJoin || (connected && admission?.roomId === item.id)} onClick={() => void run(() => join(item.id))}>Flüsterraum betreten</Button> : <span className="field-help">Privater Raum</span>}{isGm ? <Button variant="quiet" disabled={busy} onClick={() => void run(() => mutate(`/whispers/${encodeURIComponent(item.id)}`, "DELETE"))}>Schließen</Button> : null}</div></div>)}
        {isGm ? <form onSubmit={event => { event.preventDefault(); void run(async () => { const created = await request<MediaRoom>("/whispers", "POST", { memberIds: invited }); setInvited([]); refresh(); await join(created.id); }); }}><fieldset disabled={!canJoin || busy}><legend>Ein bis fünf Mitglieder einladen</legend>{members.filter(person => person.userId !== userId && !blocked.has(person.userId)).map(person => <label className="media-invite" key={person.userId}><input type="checkbox" checked={invited.includes(person.userId)} disabled={!invited.includes(person.userId) && invited.length >= 5} onChange={event => setInvited(value => event.target.checked ? [...value, person.userId] : value.filter(id => id !== person.userId))} />{person.displayName}</label>)}<Button type="submit" disabled={!invited.length}>Flüsterraum öffnen</Button></fieldset></form> : null}
      </section>
      {isGm ? <details className="media-moderation"><summary>Sprachzugang verwalten</summary><p className="field-help">Eine Sperre beendet betroffene Sprachräume. Die übrigen Mitglieder können danach neu beitreten.</p>{members.filter(person => person.userId !== userId).map(person => <div className="media-moderation-row" key={person.userId}><span>{person.displayName}</span><Button variant={blocked.has(person.userId) ? "default" : "quiet"} disabled={busy} onClick={() => void run(() => mutate(`/members/${encodeURIComponent(person.userId)}/${blocked.has(person.userId) ? "restore" : "revoke"}`, "POST"))}>{blocked.has(person.userId) ? "Sprachzugang wiederherstellen" : "Sprachzugang sperren"}</Button></div>)}</details> : null}
    </section>, document.body) : null}
  </>;
}
