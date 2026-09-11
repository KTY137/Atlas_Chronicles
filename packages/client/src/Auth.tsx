// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import { ArrowRight, Fingerprint, KeyRound, Sparkles } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, ApiError, errorText, type PendingJoin } from "./api";
import { useResource, useTask } from "./hooks";
import { t } from "./i18n";

const pendingKey = "chronicle.pending-join.v1";
function savedJoin(): PendingJoin | null {
  try { const data = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null") as PendingJoin | null;
    return data && typeof data.id === "string" && typeof data.pollToken === "string" && data.expiresAt > Date.now() ? data : null;
  } catch { return null; }
}

export function Auth({ onAuthenticated }: { onAuthenticated: (campaignId?: string) => Promise<void> }) {
  const setup = useResource<{ required: boolean }>("/api/setup");
  const reachability = useResource<{ passkeyEligible: boolean }>("/api/reachability");
  const task = useTask(), [name, setName] = useState(""), [secret, setSecret] = useState("");
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(location.search).get("join") ?? "");
  // Ein Kopplungslink aus dem Hostfenster trägt den Code in der Adresse. Ohne diese Zeile
  // müsste er abgetippt werden — und zwar von jemandem, der gerade nicht hereinkommt.
  const [pairCode, setPairCode] = useState(() => new URLSearchParams(location.search).get("pair") ?? "");
  const [pending, setPending] = useState(savedJoin), [approved, setApproved] = useState(false), [pollError, setPollError] = useState("");

  useEffect(() => {
    if (!pending || approved) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const status = await api<{ status: string }>(`/api/joins/${encodeURIComponent(pending.id)}/status`, { method: "POST", body: { pollToken: pending.pollToken }, signal: controller.signal });
        if (controller.signal.aborted) return;
        setPollError("");
        if (status.status === "approved") { setApproved(true); return; }
        if (status.status === "rejected") { setPollError(t("Die Spielleitung hat deine Anfrage abgelehnt. Frag sie, ob du es noch einmal versuchen sollst.")); return; }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPollError(error instanceof ApiError && error.status === 404 ? t("Die Anfrage ist abgelaufen oder die Einladung wurde widerrufen.") : errorText(error));
        if (error instanceof ApiError && error.status === 404) return;
      }
      timer = setTimeout(poll, 2500);
    };
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [pending, approved]);

  const login = () => task.run(async () => {
    const { startAuthentication } = await import("@simplewebauthn/browser");
    const ceremony = await api<{ challengeId: string; options: Parameters<typeof startAuthentication>[0]["optionsJSON"] }>("/api/passkeys/login/options", { method: "POST" });
    const response = await startAuthentication({ optionsJSON: ceremony.options });
    await api("/api/passkeys/login", { method: "POST", body: { challengeId: ceremony.challengeId, response } });
    await onAuthenticated();
  });

  return <main className="auth-layout"><section className="auth-story" aria-label={t("Willkommen bei Atlas Chronicles")}>
    <div className="brand"><span aria-hidden="true">A<span className="brand-star">✧</span></span><strong>ATLAS<br /><small>CHRONICLES</small></strong></div>
    <div className="auth-copy"><p className="eyebrow">{t("Jede Welt beginnt mit einer Geschichte.")}</p><h1>{t("Was ihr erlebt, bleibt.")}</h1><p>{t("Ein Zuhause für eure Welt. Ein gemeinsames Buch – und für jede Figur eine eigene Geschichte.")}</p><div className="auth-divider" /><span className="auth-caption"><Sparkles size={16} /> {t("Die nächste Seite gehört euch.")}</span></div>
    <div className="orbital-art" aria-hidden="true"><i /><i /><i /><span>✧</span></div>
  </section><section className="auth-panel"><div className="auth-card">
    {setup.loading ? <Loading /> : setup.error ? <Notice error>{setup.error}</Notice> : setup.data?.required ? <>
      <p className="eyebrow">{t("Der erste Schritt")}</p><h2>{t("Deine Chronik beginnt.")}</h2><p className="muted">{t("Richte die Spielleitung für diesen Server ein.")}</p>
      <form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
        await api("/api/setup", { method: "POST", body: { displayName: name }, authorization: `Bearer ${secret}` }); setSecret(""); await onAuthenticated();
      }); }}>
        <label>{t("Dein Name")}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="nickname" /></label>
        <label>{t("Einrichtungsschlüssel")}<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required minLength={32} autoComplete="off" aria-describedby="setup-help" /></label>
        <p id="setup-help" className="field-help">{t("Der Serverbetreiber findet ihn in der lokalen Konfiguration unter „bootstrapToken“.")}</p>
        <Button type="submit" variant="primary" disabled={task.busy}>{t("Chronik einrichten")} <ArrowRight size={16} /></Button>
      </form>
    </> : pending ? <>
      <p className="eyebrow">{t("Dein Platz am Tisch")}</p><h2>{approved ? t("Du bist eingeladen.") : t("Die Runde erwartet dich.")}</h2>
      <p className="muted">{approved ? t("Die Spielleitung hat deinen Beitritt freigegeben.") : t("Deine Anfrage liegt bei der Spielleitung. Diese Seite aktualisiert sich automatisch.")}</p>
      {pollError ? <Notice error>{pollError}</Notice> : !approved ? <Loading text={t("Warte auf Freigabe …")} /> : null}
      {approved ? <Button variant="primary" disabled={task.busy} onClick={() => void task.run(async () => {
        const result = await api<{ campaignId: string }>(`/api/joins/${encodeURIComponent(pending.id)}/claim`, { method: "POST", body: { pollToken: pending.pollToken } });
        sessionStorage.removeItem(pendingKey); setPending(null); await onAuthenticated(result.campaignId);
      })}>{t("Die Runde betreten")} <ArrowRight size={16} /></Button> : null}
      <Button variant="quiet" onClick={() => { sessionStorage.removeItem(pendingKey); setPending(null); setApproved(false); setPollError(""); }}>{t("Zurück zur Anmeldung")}</Button>
    </> : <>
      <p className="eyebrow">{t("Willkommen zurück")}</p><h2>{t("Dein Platz ist noch da.")}</h2><p className="muted">{t("Öffne deine Chronik oder komm zu einer neuen Runde.")}</p>
      <Button variant="primary" className="full-width" disabled={task.busy || !reachability.data?.passkeyEligible} onClick={() => void login()}><Fingerprint size={19} /> {t("Mit Passkey anmelden")}</Button>
      {reachability.data && !reachability.data.passkeyEligible ? <p className="field-help">{t("Passkeys benötigen HTTPS oder localhost. Du kannst weiterhin über einen Einladungs- oder Kopplungscode beitreten.")}</p> : null}
      <div className="form-divider">{t("Zu einer Runde kommen")}</div>
      <form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
        let code = joinCode.trim(); try { code = new URL(code).searchParams.get("join") ?? code; } catch { /* Raw invitation code. */ }
        const next = await api<PendingJoin>(`/join/${encodeURIComponent(code)}`, { method: "POST", body: { displayName: name } });
        setPending(next); sessionStorage.setItem(pendingKey, JSON.stringify(next));
      }); }}>
        <label>{t("Einladungslink oder Code")}<input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required autoComplete="off" /></label>
        <label>{t("Dein Name in der Runde")}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="nickname" /></label>
        <Button type="submit" disabled={task.busy}>{t("Beitritt anfragen")} <ArrowRight size={16} /></Button>
      </form>
      <details open={!!new URLSearchParams(location.search).get("pair")}><summary><KeyRound size={14} /> {t("Neues Gerät verbinden")}</summary><form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
        let code = pairCode.trim(); try { code = new URL(code).searchParams.get("pair") ?? code; } catch { /* Roher Kopplungscode. */ }
        await api("/api/pairing/redeem", { method: "POST", body: { code } }); setPairCode(""); await onAuthenticated();
      }); }}><label>{t("Kopplungslink oder Code der Spielleitung")}<input value={pairCode} onChange={(e) => setPairCode(e.target.value)} autoComplete="off" required /></label><Button type="submit" disabled={task.busy}>{t("Gerät verbinden")}</Button></form></details>
    </>}
    {task.error ? <Notice error>{task.status === 409 ? t("Dieser Name ist bereits vergeben. Wähle bitte einen unterscheidbaren Namen.") : task.error}</Notice> : null}
  </div><p className="auth-footer">{t("Eure Geschichten bleiben bei eurem Server.")}</p></section></main>;
}
