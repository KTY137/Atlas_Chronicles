// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiPath, ApiError } from "../api";
import { t } from "../i18n";

export type LiveStatus = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "unavailable";
export interface CampaignPresence { userId: string; displayName: string; state: "online" | "away" }
export interface CampaignMessageDraft { body: string; kind: "letter" | "table"; parentId?: string; expectedScene?: { id: string; version: number } }
export interface CampaignLive {
  campaignId: string | null;
  status: LiveStatus;
  presence: CampaignPresence[];
  revision: number;
  error: string;
  retry: () => void;
  refresh: () => void;
  sendMessage: (draft: CampaignMessageDraft) => Promise<{ id: string }>;
}
/** Anzeigetexte des Verbindungsstands; die Anzeigestelle übersetzt mit `t(LIVE_STATUS_LABEL[status])`. */
export const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  idle: "Keine Kampagne geöffnet", connecting: "Verbindung wird aufgebaut", connected: "Live verbunden",
  reconnecting: "Verbindung wird wiederhergestellt", offline: "Gerät ist offline", unavailable: "Live-Zugang nicht verfügbar",
};
/** Bisheriger Name derselben Tabelle; `App.tsx` liest sie noch darüber. */

interface PendingMessage { commandId: string; request?: Promise<{ id: string }> }
interface Scope { key: string; seq: number | null; messages: Map<string, PendingMessage>; requests: Set<AbortController> }
interface Snapshot { key: string; status: LiveStatus; presence: CampaignPresence[]; revision: number; error: string }
const sequence = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Mount once in the authenticated shell; both the band and channel share this connection. */
export function useCampaignLive(campaignId: string | null, userId: string | null = null): CampaignLive {
  const key = JSON.stringify([campaignId, userId]);
  const scopeRef = useRef<Scope>({ key, seq: null, messages: new Map(), requests: new Set() });
  const [snapshot, setSnapshot] = useState<Snapshot>({ key, status: campaignId ? "connecting" : "idle", presence: [], revision: 0, error: "" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const refresh = useCallback(() => setSnapshot(value => value.key === key ? { ...value, revision: value.revision + 1 } : value), [key]);

  useEffect(() => {
    if (scopeRef.current.key !== key) {
      for (const request of scopeRef.current.requests) request.abort();
      scopeRef.current = { key, seq: null, messages: new Map(), requests: new Set() };
    }
    const scope = scopeRef.current;
    setSnapshot(value => ({ key, status: campaignId ? "connecting" : "idle", presence: [], revision: value.key === key ? value.revision : 0, error: "" }));
    if (!campaignId) return;
    let disposed = false, socket: WebSocket | null = null, failures = 0, lastHeard = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined, handshakeTimer: ReturnType<typeof setTimeout> | undefined;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    const update = (patch: Partial<Snapshot>) => { if (!disposed) setSnapshot(value => value.key === key ? { ...value, ...patch } : value); };
    const invalidate = () => { if (!disposed) setSnapshot(value => value.key === key ? { ...value, revision: value.revision + 1 } : value); };
    const clearTimers = () => { clearTimeout(handshakeTimer); clearInterval(heartbeatTimer); };
    const send = (message: unknown) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); };
    const availability = () => send({ type: "presence", state: document.visibilityState === "hidden" ? "away" : "online" });
    const connect = () => {
      if (disposed) return;
      clearTimeout(reconnectTimer);
      if (!navigator.onLine) { update({ status: "offline", presence: [] }); return; }
      update({ status: scope.seq === null ? "connecting" : "reconnecting", presence: [], error: "" });
      const url = new URL(apiPath(campaignId, "/live"), location.href);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const current = new WebSocket(url);
      socket = current;
      let resumeTarget = 0, resumeAfter = -1;
      const resume = (after: number) => { resumeAfter = after; send({ type: "resume", after }); };
      const ready = () => { failures = 0; update({ status: "connected", error: "" }); };
      handshakeTimer = setTimeout(() => current.close(), 20_000);
      current.onopen = () => {
        if (disposed || current !== socket) { current.close(); return; }
        lastHeard = Date.now();
        heartbeatTimer = setInterval(() => {
          if (Date.now() - lastHeard > 75_000) current.close();
          else send({ type: "ping" });
        }, 25_000);
      };
      current.onmessage = event => {
        if (disposed || current !== socket) return;
        lastHeard = Date.now();
        let message: Record<string, unknown>;
        try { message = JSON.parse(String(event.data)) as Record<string, unknown>; } catch { return; }
        if (!message || typeof message !== "object") return;
        if (message.type === "welcome" && sequence(message.seq)) {
          clearTimeout(handshakeTimer);
          resumeTarget = message.seq;
          availability();
          // Always refetch current projections after reconnect, including a restored database.
          invalidate();
          if (scope.seq === null || scope.seq > message.seq) { scope.seq = message.seq; ready(); }
          else resume(scope.seq);
        } else if (message.type === "refresh" && sequence(message.seq)) {
          if (scope.seq === null || message.seq > scope.seq) { scope.seq = message.seq; invalidate(); }
        } else if (message.type === "resumed" && sequence(message.seq)) {
          scope.seq = Math.max(scope.seq ?? 0, message.seq);
          // The server returns at most 256 invalidations per resume request.
          if (scope.seq < resumeTarget && scope.seq > resumeAfter) resume(scope.seq);
          else { scope.seq = Math.max(scope.seq, resumeTarget); invalidate(); ready(); }
        } else if (message.type === "presence" && Array.isArray(message.members)) {
          update({ presence: message.members.filter((member): member is CampaignPresence =>
            !!member && typeof member === "object" && typeof member.userId === "string" && typeof member.displayName === "string" && (member.state === "online" || member.state === "away")) });
        } else if (message.type === "error") {
          // This connection sends only resume/presence/heartbeat; mutations use correlated HTTP responses.
          scope.seq = null;
          current.close();
        }
      };
      current.onerror = () => { if (!disposed && current === socket) current.close(); };
      current.onclose = event => {
        if (disposed || current !== socket) return;
        clearTimers(); socket = null;
        if (event.code === 1008) { update({ status: "unavailable", presence: [], error: t("Der Server hat die Live-Verbindung beendet. Prüfe deinen Zugang oder verbinde dich erneut.") }); return; }
        update({ status: navigator.onLine ? "reconnecting" : "offline", presence: [] });
        if (navigator.onLine) reconnectTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5)));
      };
    };
    const online = () => { if (!socket || socket.readyState === WebSocket.CLOSED) connect(); };
    const offline = () => { clearTimeout(reconnectTimer); update({ status: "offline", presence: [] }); socket?.close(); };
    const visible = () => { availability(); if (document.visibilityState !== "hidden") { send({ type: "ping" }); online(); } };
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    connect();
    return () => {
      disposed = true; clearTimeout(reconnectTimer); clearTimers(); socket?.close();
      window.removeEventListener("online", online); window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [campaignId, key, attempt]);

  useEffect(() => () => { for (const request of scopeRef.current.requests) request.abort(); }, [key]);

  const sendMessage = useCallback((draft: CampaignMessageDraft): Promise<{ id: string }> => {
    const scope = scopeRef.current;
    if (!campaignId || scope.key !== key) return Promise.reject(new Error(t("Öffne die Kampagne erneut, um deine Nachricht zu senden.")));
    const input = { body: draft.body.trim(), kind: draft.kind, ...(draft.parentId ? { parentId: draft.parentId } : {}), ...(draft.expectedScene ? { expectedScene: draft.expectedScene } : {}) };
    if (!input.body || input.body.length > 8000) return Promise.reject(new Error(t("Eine Nachricht braucht 1 bis 8000 Zeichen.")));
    const fingerprint = JSON.stringify(input);
    // Keep the original command id after any uncertain response, even across reconnects and stage changes.
    const pending = scope.messages.get(fingerprint) ?? { commandId: crypto.randomUUID() };
    if (pending.request) return pending.request;
    scope.messages.set(fingerprint, pending);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20_000);
    scope.requests.add(controller);
    pending.request = (async () => {
      try {
        const result = await api<{ id: string }>(apiPath(campaignId, "/messages"), { method: "POST", body: { ...input, commandId: pending.commandId }, signal: controller.signal });
        if (!result || typeof result.id !== "string") throw new Error("missing-acknowledgement");
        scope.messages.delete(fingerprint);
        if (scopeRef.current === scope) refresh();
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) throw error;
        throw new Error(t("Die Zustellung ist noch nicht bestätigt. Versuche dieselbe Nachricht erneut; sie wird dabei höchstens einmal gespeichert."));
      } finally { clearTimeout(timeout); scope.requests.delete(controller); delete pending.request; }
    })();
    return pending.request;
  }, [campaignId, key, refresh]);

  const current = snapshot.key === key ? snapshot : { status: campaignId ? "connecting" as const : "idle" as const, presence: [], revision: 0, error: "" };
  return { campaignId, status: current.status, presence: current.presence, revision: current.revision, error: current.error, retry, refresh, sendMessage };
}
